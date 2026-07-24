// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInsteadLendingAdapter {
    function ADAPTER_ID() external view returns (bytes32);
    function adapterVersion() external view returns (uint256);
    function supportsAsset(address asset) external view returns (bool);
    function supplyFor(address user, address asset, uint256 amount) external;
    function withdrawFor(address user, address asset, uint256 amount) external returns (uint256 withdrawn);
    function borrowFor(address user, address asset, uint256 amount) external;
    function repayFor(address user, address asset, uint256 amount) external returns (uint256 repaid);
}
