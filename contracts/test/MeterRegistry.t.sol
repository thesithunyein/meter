// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, Vm} from "forge-std/Test.sol";
import {MeterRegistry} from "../MeterRegistry.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract MeterRegistryTest is Test {
    // ── actors ────────────────────────────────────────────────────────────────
    address internal provider = makeAddr("provider");
    address internal caller   = makeAddr("caller");

    // ── fixtures ──────────────────────────────────────────────────────────────
    MockERC20       internal usdc;
    MeterRegistry   internal registry;

    string  internal constant NAME  = "My API";
    string  internal constant URL   = "https://api.example.com";
    uint256 internal constant PRICE = 100e6; // 100 USDC (6 dec)

    // Seed balances so tests start with funded actors.
    uint256 internal constant CALLER_USDC = 10_000e6;

    function setUp() public {
        usdc     = new MockERC20("Mock USDC", "mUSDC", 6);
        registry = new MeterRegistry(address(usdc));

        usdc.mint(caller, CALLER_USDC);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Constructor
    // ─────────────────────────────────────────────────────────────────────────

    function test_Constructor_ZeroAddress_Reverts() public {
        vm.expectRevert(MeterRegistry.ZeroAddress.selector);
        new MeterRegistry(address(0));
    }

    function test_Constructor_SetsUsdc() public view {
        assertEq(address(registry.usdc()), address(usdc));
    }

    function test_Constructor_EndpointCountZero() public view {
        assertEq(registry.endpointCount(), 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. register – happy path
    // ─────────────────────────────────────────────────────────────────────────

    function test_Register_EmitsRegisteredEvent() public {
        vm.prank(provider);
        vm.expectEmit(true, true, false, true, address(registry));
        emit MeterRegistry.Registered(provider, 0, NAME, URL, PRICE);
        registry.register(NAME, URL, PRICE);
    }

    function test_Register_EndpointCountIncrements() public {
        assertEq(registry.endpointCount(), 0);

        vm.prank(provider);
        registry.register(NAME, URL, PRICE);
        assertEq(registry.endpointCount(), 1);

        vm.prank(provider);
        registry.register("Second", "https://b.com", 1e6);
        assertEq(registry.endpointCount(), 2);
    }

    function test_Register_EndpointStructFields() public {
        vm.prank(provider);
        uint256 id = registry.register(NAME, URL, PRICE);

        (address p, string memory n, string memory u, uint256 pr, bool active) =
            registry.endpoints(id);

        assertEq(p,      provider);
        assertEq(n,      NAME);
        assertEq(u,      URL);
        assertEq(pr,     PRICE);
        assertTrue(active);
    }

    function test_Register_ActiveTrue() public {
        vm.prank(provider);
        uint256 id = registry.register(NAME, URL, PRICE);

        (,,,, bool active) = registry.endpoints(id);
        assertTrue(active);
    }

    function test_Register_ReturnsCorrectEndpointId() public {
        vm.prank(provider);
        uint256 id0 = registry.register(NAME, URL, PRICE);
        assertEq(id0, 0);

        vm.prank(provider);
        uint256 id1 = registry.register("B", "https://b.com", 1e6);
        assertEq(id1, 1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. register – revert paths
    // ─────────────────────────────────────────────────────────────────────────

    function test_Register_ZeroPrice_Reverts() public {
        vm.prank(provider);
        vm.expectRevert(MeterRegistry.ZeroPrice.selector);
        registry.register(NAME, URL, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. pay – happy path
    // ─────────────────────────────────────────────────────────────────────────

    function _registerEndpoint() internal returns (uint256 id) {
        vm.prank(provider);
        id = registry.register(NAME, URL, PRICE);
    }

    function _approveAndPay(address payer, uint256 id) internal {
        vm.prank(payer);
        usdc.approve(address(registry), type(uint256).max);
        vm.prank(payer);
        registry.pay(id);
    }

    function test_Pay_TransfersUsdcFromCallerToProvider() public {
        uint256 id = _registerEndpoint();

        uint256 callerBefore   = usdc.balanceOf(caller);
        uint256 providerBefore = usdc.balanceOf(provider);

        _approveAndPay(caller, id);

        assertEq(usdc.balanceOf(caller),   callerBefore   - PRICE);
        assertEq(usdc.balanceOf(provider), providerBefore + PRICE);
    }

    function test_Pay_EmitsPaidEvent() public {
        uint256 id = _registerEndpoint();

        vm.prank(caller);
        usdc.approve(address(registry), type(uint256).max);

        vm.prank(caller);
        vm.expectEmit(true, true, false, true, address(registry));
        emit MeterRegistry.Paid(caller, id, PRICE, 1);
        registry.pay(id);
    }

    function test_Pay_PaidEventHasCorrectFields() public {
        uint256 id = _registerEndpoint();

        vm.prank(caller);
        usdc.approve(address(registry), type(uint256).max);

        vm.recordLogs();
        vm.prank(caller);
        registry.pay(id);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        // Paid is the second event (after nothing else here), topic[0] = keccak of sig
        bytes32 paidSig = keccak256("Paid(address,uint256,uint256,uint256)");
        bool found;
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].topics[0] == paidSig) {
                address logCaller   = address(uint160(uint256(logs[i].topics[1])));
                uint256 logId       = uint256(logs[i].topics[2]);
                (uint256 amount, uint256 nonce) = abi.decode(logs[i].data, (uint256, uint256));
                assertEq(logCaller, caller);
                assertEq(logId,     id);
                assertEq(amount,    PRICE);
                assertEq(nonce,     1);
                found = true;
            }
        }
        assertTrue(found, "Paid event not found");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. nonce increments on each pay call
    // ─────────────────────────────────────────────────────────────────────────

    function test_Pay_NonceIncrementsEachCall() public {
        uint256 id = _registerEndpoint();

        vm.prank(caller);
        usdc.approve(address(registry), type(uint256).max);

        assertEq(registry.nonces(id), 0);

        vm.prank(caller);
        registry.pay(id);
        assertEq(registry.nonces(id), 1);

        vm.prank(caller);
        registry.pay(id);
        assertEq(registry.nonces(id), 2);

        vm.prank(caller);
        registry.pay(id);
        assertEq(registry.nonces(id), 3);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. pay – revert paths
    // ─────────────────────────────────────────────────────────────────────────

    function test_Pay_EndpointNotFound_WhenIdGeCount() public {
        // no endpoints registered yet
        vm.expectRevert(MeterRegistry.EndpointNotFound.selector);
        registry.pay(0);
    }

    function test_Pay_EndpointNotFound_WhenIdEqualsCount() public {
        _registerEndpoint(); // count becomes 1, so id==1 must revert
        vm.expectRevert(MeterRegistry.EndpointNotFound.selector);
        registry.pay(1);
    }

    function test_Pay_PaymentFailed_OnFailedTransfer() public {
        uint256 id = _registerEndpoint();

        // approve but make the token return false on transferFrom
        vm.prank(caller);
        usdc.approve(address(registry), type(uint256).max);

        usdc.setFail(true);

        vm.prank(caller);
        vm.expectRevert(MeterRegistry.PaymentFailed.selector);
        registry.pay(id);
    }

    function test_Pay_EndpointInactive_Reverts() public {
        uint256 id = _registerEndpoint();

        // deactivate first
        vm.prank(provider);
        registry.deactivate(id);

        vm.prank(caller);
        usdc.approve(address(registry), type(uint256).max);

        vm.prank(caller);
        vm.expectRevert(MeterRegistry.EndpointInactive.selector);
        registry.pay(id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. deactivate – happy path
    // ─────────────────────────────────────────────────────────────────────────

    function test_Deactivate_SetsActiveFalse() public {
        uint256 id = _registerEndpoint();

        vm.prank(provider);
        registry.deactivate(id);

        (,,,, bool active) = registry.endpoints(id);
        assertFalse(active);
    }

    function test_Deactivate_EmitsDeactivatedEvent() public {
        uint256 id = _registerEndpoint();

        vm.prank(provider);
        vm.expectEmit(true, true, false, false, address(registry));
        emit MeterRegistry.Deactivated(provider, id);
        registry.deactivate(id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. deactivate – revert paths
    // ─────────────────────────────────────────────────────────────────────────

    function test_Deactivate_NotProvider_Reverts() public {
        uint256 id = _registerEndpoint();

        vm.prank(caller); // not the provider
        vm.expectRevert(MeterRegistry.NotProvider.selector);
        registry.deactivate(id);
    }

    function test_Deactivate_EndpointNotFound_Reverts() public {
        vm.expectRevert(MeterRegistry.EndpointNotFound.selector);
        registry.deactivate(0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Fuzz: price → payment amount matches exactly
    // ─────────────────────────────────────────────────────────────────────────

    function testFuzz_Pay_AmountMatchesPrice(uint256 price) public {
        // Bound to sane USDC range: 1 unit to 1 billion USDC (6 decimals).
        price = bound(price, 1, 1_000_000_000e6);

        // Mint enough for caller.
        usdc.mint(caller, price);

        vm.prank(provider);
        uint256 id = registry.register("Fuzz API", "https://fuzz.io", price);

        uint256 callerBefore   = usdc.balanceOf(caller);
        uint256 providerBefore = usdc.balanceOf(provider);

        vm.prank(caller);
        usdc.approve(address(registry), price);

        vm.prank(caller);
        registry.pay(id);

        assertEq(usdc.balanceOf(caller),   callerBefore   - price, "caller delta mismatch");
        assertEq(usdc.balanceOf(provider), providerBefore + price, "provider delta mismatch");
    }
}
