// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MeterRegistry {
    error ZeroPrice();
    error ZeroAddress();
    error EndpointNotFound();
    error EndpointInactive();
    error NotProvider();
    error PaymentFailed();

    event Registered(
        address indexed provider,
        uint256 indexed endpointId,
        string name,
        string url,
        uint256 price
    );

    event Paid(
        address indexed caller,
        uint256 indexed endpointId,
        uint256 amount,
        uint256 nonce
    );

    event Deactivated(address indexed provider, uint256 indexed endpointId);

    struct Endpoint {
        address provider;
        string name;
        string url;
        uint256 price;
        bool active;
    }

    IERC20 public immutable usdc;

    uint256 public endpointCount;
    mapping(uint256 => Endpoint) public endpoints;
    mapping(uint256 => uint256) public nonces;

    constructor(address usdc_) {
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
    }

    function register(
        string calldata name,
        string calldata url,
        uint256 price
    ) external returns (uint256 endpointId) {
        if (price == 0) revert ZeroPrice();

        endpointId = endpointCount;
        endpointCount = endpointCount + 1;

        endpoints[endpointId] = Endpoint({
            provider: msg.sender,
            name: name,
            url: url,
            price: price,
            active: true
        });

        emit Registered(msg.sender, endpointId, name, url, price);
    }

    function pay(uint256 endpointId) external {
        if (endpointId >= endpointCount) revert EndpointNotFound();

        Endpoint storage endpoint = endpoints[endpointId];
        if (!endpoint.active) revert EndpointInactive();

        uint256 amount = endpoint.price;

        if (!usdc.transferFrom(msg.sender, endpoint.provider, amount)) {
            revert PaymentFailed();
        }

        uint256 nonce = nonces[endpointId] + 1;
        nonces[endpointId] = nonce;

        emit Paid(msg.sender, endpointId, amount, nonce);
    }

    function deactivate(uint256 endpointId) external {
        if (endpointId >= endpointCount) revert EndpointNotFound();

        Endpoint storage endpoint = endpoints[endpointId];
        if (msg.sender != endpoint.provider) revert NotProvider();

        endpoint.active = false;

        emit Deactivated(msg.sender, endpointId);
    }
}
