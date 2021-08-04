import "../IPathFinder.sol";

contract PathFinderMock is IPathFinder {
    function findPath(address _tokenA, address _tokenB) external view override returns (address[] memory path) {
        address[] memory path = new address[](2);
        path[0] = _tokenA;
        path[1] = _tokenB;
    }

    function addRouteAddress(address _token, address _tokenRoute) external override {

    }
    function removeRouteAddress(address _token) external override {

    }

    function getRouteAddress(address _token) external view override returns (address) {
        return address(this);
    }
}