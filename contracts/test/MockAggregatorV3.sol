// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockAggregatorV3 {
    int256 private immutable answer;
    uint256 private immutable timestamp;

    constructor(int256 answer_) {
        answer = answer_;
        timestamp = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer_, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, answer, timestamp, timestamp, 1);
    }
}
