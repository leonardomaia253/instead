use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
    Metadata,
};
use anchor_spl::token_2022::{mint_to, MintTo, Token2022};
use anchor_spl::token_interface::{Mint, TokenAccount};

declare_id!("BXg5tAMHYNbYhfxd6eYR7j3njk2nozb5Bk6JZuqhdtzy");

pub const MAX_NAME_LEN: usize = 64;
pub const MAX_SYMBOL_LEN: usize = 16;
pub const MAX_URI_LEN: usize = 200;
pub const MAX_PRESET_CODE_LEN: usize = 32;
pub const MAX_BPS: u16 = 10_000;

#[program]
pub mod instead_solana_factory {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        args: InitializePlatformArgs,
    ) -> Result<()> {
        require!(args.creation_fee_lamports <= 100_000_000_000, InsteadError::FeeTooHigh);

        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.treasury = ctx.accounts.treasury.key();
        platform.pending_authority = Pubkey::default();
        platform.creation_fee_lamports = args.creation_fee_lamports;
        platform.default_transfer_fee_bps = args.default_transfer_fee_bps;
        platform.max_transfer_fee_bps = args.max_transfer_fee_bps;
        platform.paused = false;
        platform.bump = ctx.bumps.platform;

        require!(platform.max_transfer_fee_bps <= MAX_BPS, InsteadError::InvalidBps);
        require!(
            platform.default_transfer_fee_bps <= platform.max_transfer_fee_bps,
            InsteadError::InvalidBps
        );

        emit!(PlatformInitialized {
            authority: platform.authority,
            treasury: platform.treasury,
            creation_fee_lamports: platform.creation_fee_lamports,
        });

        Ok(())
    }

    pub fn update_platform(ctx: Context<UpdatePlatform>, args: UpdatePlatformArgs) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        require_keys_eq!(platform.authority, ctx.accounts.authority.key(), InsteadError::Unauthorized);

        if let Some(treasury) = args.treasury {
            platform.treasury = treasury;
        }
        if let Some(creation_fee_lamports) = args.creation_fee_lamports {
            require!(creation_fee_lamports <= 100_000_000_000, InsteadError::FeeTooHigh);
            platform.creation_fee_lamports = creation_fee_lamports;
        }
        if let Some(default_transfer_fee_bps) = args.default_transfer_fee_bps {
            require!(default_transfer_fee_bps <= platform.max_transfer_fee_bps, InsteadError::InvalidBps);
            platform.default_transfer_fee_bps = default_transfer_fee_bps;
        }
        if let Some(max_transfer_fee_bps) = args.max_transfer_fee_bps {
            require!(max_transfer_fee_bps <= MAX_BPS, InsteadError::InvalidBps);
            require!(platform.default_transfer_fee_bps <= max_transfer_fee_bps, InsteadError::InvalidBps);
            platform.max_transfer_fee_bps = max_transfer_fee_bps;
        }
        if let Some(paused) = args.paused {
            platform.paused = paused;
        }

        emit!(PlatformUpdated {
            authority: platform.authority,
            treasury: platform.treasury,
            paused: platform.paused,
        });

        Ok(())
    }

    pub fn nominate_authority(ctx: Context<UpdatePlatform>, pending_authority: Pubkey) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        require_keys_eq!(platform.authority, ctx.accounts.authority.key(), InsteadError::Unauthorized);
        require_keys_neq!(pending_authority, Pubkey::default(), InsteadError::InvalidAuthority);
        platform.pending_authority = pending_authority;
        emit!(AuthorityNominated { pending_authority });
        Ok(())
    }

    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        let platform = &mut ctx.accounts.platform;
        require_keys_eq!(
            platform.pending_authority,
            ctx.accounts.pending_authority.key(),
            InsteadError::Unauthorized
        );
        platform.authority = ctx.accounts.pending_authority.key();
        platform.pending_authority = Pubkey::default();
        emit!(AuthorityAccepted { authority: platform.authority });
        Ok(())
    }

    pub fn create_token(ctx: Context<CreateToken>, args: CreateTokenArgs) -> Result<()> {
        validate_token_args(&args)?;

        let platform = &ctx.accounts.platform;
        require!(!platform.paused, InsteadError::PlatformPaused);
        require!(
            args.transfer_fee_bps <= platform.max_transfer_fee_bps,
            InsteadError::InvalidBps
        );

        if platform.creation_fee_lamports > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.creator.key(),
                &ctx.accounts.treasury.key(),
                platform.creation_fee_lamports,
            );
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.creator.to_account_info(),
                    ctx.accounts.treasury.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    mint_authority: ctx.accounts.mint_authority.to_account_info(),
                    payer: ctx.accounts.creator.to_account_info(),
                    update_authority: ctx.accounts.update_authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            DataV2 {
                name: args.name.clone(),
                symbol: args.symbol.clone(),
                uri: args.uri.clone(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            args.mutable_metadata,
            true,
            None,
        )?;

        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
            ),
            args.initial_supply,
        )?;

        let launch = &mut ctx.accounts.launch;
        launch.platform = platform.key();
        launch.creator = ctx.accounts.creator.key();
        launch.mint = ctx.accounts.mint.key();
        launch.name = args.name;
        launch.symbol = args.symbol;
        launch.uri = args.uri;
        launch.preset_code = args.preset_code;
        launch.decimals = args.decimals;
        launch.initial_supply = args.initial_supply;
        launch.transfer_fee_bps = args.transfer_fee_bps;
        launch.mintable = args.mintable;
        launch.freezable = args.freezable;
        launch.mutable_metadata = args.mutable_metadata;
        launch.fair_launch = args.fair_launch;
        launch.liquidity_status = LiquidityStatus::NotConfigured;
        launch.created_at = Clock::get()?.unix_timestamp;
        launch.bump = ctx.bumps.launch;

        emit!(TokenCreated {
            creator: launch.creator,
            mint: launch.mint,
            symbol: launch.symbol.clone(),
            preset_code: launch.preset_code.clone(),
            initial_supply: launch.initial_supply,
            fair_launch: launch.fair_launch,
        });

        Ok(())
    }

    pub fn mark_liquidity_planned(
        ctx: Context<UpdateLaunch>,
        aggregator: LiquidityAggregator,
        quoted_in_mint: Pubkey,
        amount_in: u64,
        min_amount_out: u64,
        quote_expires_at: i64,
    ) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        require_keys_eq!(launch.creator, ctx.accounts.creator.key(), InsteadError::Unauthorized);
        require!(quote_expires_at > Clock::get()?.unix_timestamp, InsteadError::QuoteExpired);
        require!(amount_in > 0 && min_amount_out > 0, InsteadError::InvalidLiquidityPlan);

        launch.liquidity_status = LiquidityStatus::Planned {
            aggregator,
            quoted_in_mint,
            amount_in,
            min_amount_out,
            quote_expires_at,
        };

        emit!(LiquidityPlanned {
            mint: launch.mint,
            aggregator,
            amount_in,
            min_amount_out,
            quote_expires_at,
        });

        Ok(())
    }

    pub fn mark_liquidity_completed(ctx: Context<UpdateLaunch>, tx_signature_hash: [u8; 32]) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        require_keys_eq!(launch.creator, ctx.accounts.creator.key(), InsteadError::Unauthorized);
        launch.liquidity_status = LiquidityStatus::Completed { tx_signature_hash };

        emit!(LiquidityCompleted {
            mint: launch.mint,
            tx_signature_hash,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Platform::INIT_SPACE,
        seeds = [b"platform"],
        bump
    )]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Treasury can be a multisig/system account/program-owned account. It only receives lamports here.
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePlatform<'info> {
    #[account(mut, seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(mut, seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    pub pending_authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(args: CreateTokenArgs)]
pub struct CreateToken<'info> {
    #[account(mut, seeds = [b"platform"], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    #[account(
        init,
        payer = creator,
        mint::decimals = args.decimals,
        mint::authority = mint_authority,
        mint::freeze_authority = freeze_authority,
        mint::token_program = token_program
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = creator,
        associated_token::token_program = token_program
    )]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = creator,
        space = 8 + TokenLaunch::INIT_SPACE,
        seeds = [b"launch", mint.key().as_ref()],
        bump
    )]
    pub launch: Account<'info, TokenLaunch>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, address = platform.treasury)]
    /// CHECK: Treasury is configured by platform authority.
    pub treasury: UncheckedAccount<'info>,
    /// CHECK: Mint authority can be creator or a governance PDA/multisig depending on preset.
    pub mint_authority: Signer<'info>,
    /// CHECK: Freeze authority can be creator/governance. Freezable=false is enforced off-chain until Token-2022 extension support lands.
    pub freeze_authority: UncheckedAccount<'info>,
    /// CHECK: Metadata PDA derived by Metaplex Token Metadata.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: Update authority can be creator/governance.
    pub update_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateLaunch<'info> {
    #[account(mut, seeds = [b"launch", launch.mint.as_ref()], bump = launch.bump)]
    pub launch: Account<'info, TokenLaunch>,
    pub creator: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Platform {
    pub authority: Pubkey,
    pub pending_authority: Pubkey,
    pub treasury: Pubkey,
    pub creation_fee_lamports: u64,
    pub default_transfer_fee_bps: u16,
    pub max_transfer_fee_bps: u16,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TokenLaunch {
    pub platform: Pubkey,
    pub creator: Pubkey,
    pub mint: Pubkey,
    #[max_len(MAX_NAME_LEN)]
    pub name: String,
    #[max_len(MAX_SYMBOL_LEN)]
    pub symbol: String,
    #[max_len(MAX_URI_LEN)]
    pub uri: String,
    #[max_len(MAX_PRESET_CODE_LEN)]
    pub preset_code: String,
    pub decimals: u8,
    pub initial_supply: u64,
    pub transfer_fee_bps: u16,
    pub mintable: bool,
    pub freezable: bool,
    pub mutable_metadata: bool,
    pub fair_launch: bool,
    pub liquidity_status: LiquidityStatus,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub enum LiquidityAggregator {
    Jupiter,
    Raydium,
    Orca,
    ManualMultisig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum LiquidityStatus {
    NotConfigured,
    Planned {
        aggregator: LiquidityAggregator,
        quoted_in_mint: Pubkey,
        amount_in: u64,
        min_amount_out: u64,
        quote_expires_at: i64,
    },
    Completed {
        tx_signature_hash: [u8; 32],
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializePlatformArgs {
    pub creation_fee_lamports: u64,
    pub default_transfer_fee_bps: u16,
    pub max_transfer_fee_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdatePlatformArgs {
    pub treasury: Option<Pubkey>,
    pub creation_fee_lamports: Option<u64>,
    pub default_transfer_fee_bps: Option<u16>,
    pub max_transfer_fee_bps: Option<u16>,
    pub paused: Option<bool>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateTokenArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub preset_code: String,
    pub decimals: u8,
    pub initial_supply: u64,
    pub transfer_fee_bps: u16,
    pub mintable: bool,
    pub freezable: bool,
    pub mutable_metadata: bool,
    pub fair_launch: bool,
}

fn validate_token_args(args: &CreateTokenArgs) -> Result<()> {
    require!(!args.name.trim().is_empty(), InsteadError::InvalidName);
    require!(args.name.len() <= MAX_NAME_LEN, InsteadError::InvalidName);
    require!(!args.symbol.trim().is_empty(), InsteadError::InvalidSymbol);
    require!(args.symbol.len() <= MAX_SYMBOL_LEN, InsteadError::InvalidSymbol);
    require!(args.uri.len() <= MAX_URI_LEN, InsteadError::InvalidUri);
    require!(args.preset_code.len() <= MAX_PRESET_CODE_LEN, InsteadError::InvalidPreset);
    require!(args.decimals <= 9, InsteadError::InvalidDecimals);
    require!(args.initial_supply > 0, InsteadError::InvalidSupply);
    require!(args.transfer_fee_bps <= MAX_BPS, InsteadError::InvalidBps);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_args() -> CreateTokenArgs {
        CreateTokenArgs {
            name: "Instead Solana Token".to_string(),
            symbol: "IST".to_string(),
            uri: "https://instead.finance/metadata/ist.json".to_string(),
            preset_code: "standard".to_string(),
            decimals: 9,
            initial_supply: 1_000_000_000,
            transfer_fee_bps: 250,
            mintable: true,
            freezable: false,
            mutable_metadata: true,
            fair_launch: false,
        }
    }

    #[test]
    fn accepts_valid_token_args() {
        assert!(validate_token_args(&valid_args()).is_ok());
    }

    #[test]
    fn rejects_blank_or_oversized_name() {
        let mut args = valid_args();
        args.name = "   ".to_string();
        assert!(validate_token_args(&args).is_err());

        args.name = "x".repeat(MAX_NAME_LEN + 1);
        assert!(validate_token_args(&args).is_err());
    }

    #[test]
    fn rejects_blank_or_oversized_symbol() {
        let mut args = valid_args();
        args.symbol = "".to_string();
        assert!(validate_token_args(&args).is_err());

        args.symbol = "X".repeat(MAX_SYMBOL_LEN + 1);
        assert!(validate_token_args(&args).is_err());
    }

    #[test]
    fn rejects_oversized_uri_and_preset() {
        let mut args = valid_args();
        args.uri = "u".repeat(MAX_URI_LEN + 1);
        assert!(validate_token_args(&args).is_err());

        args = valid_args();
        args.preset_code = "p".repeat(MAX_PRESET_CODE_LEN + 1);
        assert!(validate_token_args(&args).is_err());
    }

    #[test]
    fn rejects_invalid_decimals_supply_and_bps() {
        let mut args = valid_args();
        args.decimals = 10;
        assert!(validate_token_args(&args).is_err());

        args = valid_args();
        args.initial_supply = 0;
        assert!(validate_token_args(&args).is_err());

        args = valid_args();
        args.transfer_fee_bps = MAX_BPS + 1;
        assert!(validate_token_args(&args).is_err());
    }
}

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub creation_fee_lamports: u64,
}

#[event]
pub struct PlatformUpdated {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub paused: bool,
}

#[event]
pub struct AuthorityNominated {
    pub pending_authority: Pubkey,
}

#[event]
pub struct AuthorityAccepted {
    pub authority: Pubkey,
}

#[event]
pub struct TokenCreated {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub symbol: String,
    pub preset_code: String,
    pub initial_supply: u64,
    pub fair_launch: bool,
}

#[event]
pub struct LiquidityPlanned {
    pub mint: Pubkey,
    pub aggregator: LiquidityAggregator,
    pub amount_in: u64,
    pub min_amount_out: u64,
    pub quote_expires_at: i64,
}

#[event]
pub struct LiquidityCompleted {
    pub mint: Pubkey,
    pub tx_signature_hash: [u8; 32],
}

#[error_code]
pub enum InsteadError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Platform is paused")]
    PlatformPaused,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Invalid token name")]
    InvalidName,
    #[msg("Invalid token symbol")]
    InvalidSymbol,
    #[msg("Invalid metadata URI")]
    InvalidUri,
    #[msg("Invalid preset")]
    InvalidPreset,
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Invalid supply")]
    InvalidSupply,
    #[msg("Invalid basis points")]
    InvalidBps,
    #[msg("Creation fee too high")]
    FeeTooHigh,
    #[msg("Quote expired")]
    QuoteExpired,
    #[msg("Invalid liquidity plan")]
    InvalidLiquidityPlan,
}
