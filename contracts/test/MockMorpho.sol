// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct MockMarketParams {
    address loanToken;
    address collateralToken;
    address oracle;
    address irm;
    uint256 lltv;
}

contract MockMorpho {
    address public lastOnBehalf;
    address public lastReceiver;
    uint256 public lastAssets;

    function supply(MockMarketParams memory, uint256 assets, uint256, address onBehalf, bytes calldata) external returns (uint256, uint256) {
        lastOnBehalf = onBehalf;
        lastAssets = assets;
        return (assets, 0);
    }

    function withdraw(MockMarketParams memory, uint256 assets, uint256, address onBehalf, address receiver) external returns (uint256, uint256) {
        lastOnBehalf = onBehalf;
        lastReceiver = receiver;
        lastAssets = assets;
        return (assets, 0);
    }

    function borrow(MockMarketParams memory, uint256 assets, uint256, address onBehalf, address receiver) external returns (uint256, uint256) {
        lastOnBehalf = onBehalf;
        lastReceiver = receiver;
        lastAssets = assets;
        return (assets, 0);
    }

    function repay(MockMarketParams memory, uint256 assets, uint256, address onBehalf, bytes calldata) external returns (uint256, uint256) {
        lastOnBehalf = onBehalf;
        lastAssets = assets;
        return (assets, 0);
    }
}
