// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "./IPair.sol";
import "./IPathFinder.sol";
import './Ownable.sol';
import './TokenAddresses.sol';

contract PathFinder is IPathFinder, Ownable {
    TokenAddresses private tokenAddresses;

    // relació de cada token amb el token que li fa d'intermediari per arribar a WBNB
    mapping (address => RouteInfo) private routeInfos;

    struct RouteInfo {
        bool directBNB;
        address tokenRoute;
    }

    constructor(
        address _tokenAddresses
    ) public {
        tokenAddresses = TokenAddresses(_tokenAddresses);
    }

    function addRouteInfoDirect(address _token) external onlyOwner override {
        routeInfos[_token].directBNB=true;
    }

    function addRouteInfoRoute(address _token, address _tokenRoute) external onlyOwner override {
        require(_tokenRoute!=address(0), 'PathFinder: you must define either a direct path to BNB or a routeToken to BNB');
        routeInfos[_token].tokenRoute=_tokenRoute;
    }

    function addRouteInfo(address _token, address _tokenRoute, bool _directBNB) external onlyOwner override {
        require(_tokenRoute!=address(0) || _directBNB, 'PathFinder: you must define either a direct path to BNB or a routeToken to BNB');

        routeInfos[_token].tokenRoute=_tokenRoute;
        routeInfos[_token].directBNB=_directBNB;
    }

    function removeRouteInfo(address _token) external onlyOwner override {
        delete routeInfos[_token];
    }

    function isTokenConnected(address _token) external view override returns (bool) {
        return routeInfos[_token].tokenRoute != address(0) || routeInfos[_token].directBNB;
    }

    function getRouteInfoTokenRoute(address _token) external view override returns (address) {
        return routeInfos[_token].tokenRoute;
    }

    function getRouteInfoDirectBNB(address _token) external view override returns (bool) {
        return routeInfos[_token].directBNB;
    }

    function getRouteInfo(address _token) internal view returns (RouteInfo memory) {
        return routeInfos[_token];
    }

    function findPath(address _tokenFrom, address _tokenTo) external view override returns (address[] memory)
    {
        RouteInfo memory infoFrom = getRouteInfo(_tokenFrom);
        RouteInfo memory infoTo = getRouteInfo(_tokenTo);
        address WBNB = tokenAddresses.findByName(tokenAddresses.BNB());

        address[] memory path;
        if((infoFrom.tokenRoute != address(0) && infoFrom.directBNB) || (infoTo.tokenRoute != address(0) && infoFrom.directBNB))
        {
            path = new address[](0);
        } else if ((_tokenFrom == WBNB && infoTo.directBNB) || (_tokenTo == WBNB && infoFrom.directBNB)) {
            // [WBNB, BUNNY] or [BUNNY, WBNB] casos en que no hi ha intermedi i un dels tokens es directament el WBNB
            path = new address[](2);
            path[0] = _tokenFrom;
            path[1] = _tokenTo;
        }
        else if ((infoFrom.tokenRoute != address(0)&&_tokenTo == WBNB)||(infoTo.tokenRoute != address(0) && _tokenFrom == WBNB)) {
            // [WBNB, BUSD, XXX] or [XXX, BUSD, WBNB] casos en que hi ha un intermig per arribar a WBNB i l'altre es directament WBNB
            path = new address[](3);
            path[0] = _tokenFrom;
            path[1] = infoFrom.tokenRoute != address(0)?infoFrom.tokenRoute:infoTo.tokenRoute;
            path[2] = _tokenTo;
        } else if (_tokenFrom == infoTo.tokenRoute || _tokenTo == infoFrom.tokenRoute) {
            // [VAI, BUSD] or [BUSD, VAI] casos en que directament l'intermedi de un dels tokens es l'altre token
            path = new address[](2);
            path[0] = _tokenFrom;
            path[1] = _tokenTo;
        } else if (infoFrom.tokenRoute != address(0) && infoFrom.tokenRoute == infoTo.tokenRoute) {
            // [VAI, DAI] or [VAI, USDC] casos en que l'intermedi es el mateix pels 2 tokens
            path = new address[](3);
            path[0] = _tokenFrom;
            path[1] = infoFrom.tokenRoute;
            path[2] = _tokenTo;
        } else if (infoFrom.directBNB && infoTo.directBNB) {
            // [USDT, BUNNY] or [BUNNY, USDT] casos en que no hi ha intermedi per cap dels tokens
            path = new address[](3);
            path[0] = _tokenFrom;
            path[1] = WBNB;
            path[2] = _tokenTo;
        } else if (infoFrom.tokenRoute != address(0) && infoTo.directBNB) {
            // [VAI, BUSD, WBNB, BUNNY] casos en que nomes el from te intermedi
            path = new address[](4);
            path[0] = _tokenFrom;
            path[1] = infoFrom.tokenRoute;
            path[2] = WBNB;
            path[3] = _tokenTo;
        } else if (infoTo.tokenRoute != address(0) && infoFrom.directBNB) {
            // [BUNNY, WBNB, BUSD, VAI] casos en que nomes el to te intermedi
            path = new address[](4);
            path[0] = _tokenFrom;
            path[1] = WBNB;
            path[2] = infoTo.tokenRoute;
            path[3] = _tokenTo;
        }  else if (infoFrom.tokenRoute != address(0) && infoTo.tokenRoute != address(0)) {
            // [VAI, BUSD, WBNB, xRoute, xToken] casos en que els 2 tenen intermedis
            path = new address[](5);
            path[0] = _tokenFrom;
            path[1] = infoFrom.tokenRoute;
            path[2] = WBNB;
            path[3] = infoTo.tokenRoute;
            path[4] = _tokenTo;
        }
        return path;
    }


    /*

    struct PathStep {
        address prevToken;
        address nextToken;
        //uint actualEndAmount; a implementar en un futur
    }

    function isMember(address[] storage _nodes,address _node) internal returns (bool) {
        for (uint i = 0; i < _nodes.length; i++) {
            if(_nodes[i]==_node)
            {
                return true;
            }
        }
        return false;
    }

    function findPathBFS(address _tokenA, address _tokenB, uint16 _maxDepth) external view override returns (address[] calldata path)
    {
        IPair[] memory pairs = MASTER_CHEF.GetAlLPs();
        PathStep[][] memory paths;
        address[] storage visitedNodes;

        uint[] storage stepNodes;
        uint i = 0; // contador pels steps del pathfinding
        uint j = 0; // contador per les parelles que revisem per el step actual
        uint k = 0; // contador d'on afegim la nova parella
        uint l = 0; // contador per les parelles que revisem del step anterior
        bool solutionFound = false;

        for (j = 0; j < pairs.length; j++) { //check all the pairs
            if(pairs[j].token0()==_tokenA)
            {
                paths[i][k] = PathStep(pairs[j].token0(),pairs[j].token1());
                visitedNodes.push(pairs[j].token1());
                k++;
                solutionFound = pairs[j].token1() == _tokenB;
            }
            else if(pairs[j].token1()==_tokenA)
            {
                paths[i][k] = PathStep(pairs[j].token1(),pairs[j].token0());
                visitedNodes.push(pairs[j].token0());
                k++;
                solutionFound = pairs[j].token0() == _tokenB;
            }
        }
        stepNodes.push(k);

        for (i = 1; i < _maxDepth && !solutionFound; i++) { //steps
            k=0;
            for (l = 0; l < stepNodes[i-1] && !solutionFound; l++) { //check all the pairs from the previous step
                for (j = 0; j < pairs.length && !solutionFound; j++) { //check all the pairs
                    if(pairs[j].token0()==paths[i-1][l].nextToken && !isMember(visitedNodes,pairs[j].token1()))
                    {
                        paths[i][k] = PathStep(pairs[j].token0(),pairs[j].token1());
                        visitedNodes.push(pairs[j].token1());
                        k++;
                        solutionFound = pairs[j].token1() == _tokenB;
                    }
                    else if(pairs[j].token1()==paths[i-1][l].nextToken && !isMember(visitedNodes,pairs[j].token0()))
                    {
                        paths[i][k] = PathStep(pairs[j].token1(),pairs[j].token0());
                        visitedNodes.push(pairs[j].token0());
                        k++;
                        solutionFound = pairs[j].token0() == _tokenB;
                    }
                }
            }
            stepNodes.push(k);
        }

        if(solutionFound)
        {
            address[] storage reversePath;
            reversePath.push(_tokenB);
            for(;i>=0;i--)
            {
                for (k = 0; k < stepNodes[i]; k++)
                {
                    if(paths[i][k].nextToken == reversePath[reversePath.length-1])
                    {
                        reversePath.push(paths[i][k].prevToken);
                        break;
                    }
                }
            }

            path = new address[](reversePath.length);
            for(i=reversePath.length;i>0;i--)
            {
                path[path.length-i]=reversePath[i];
            }
        }
        return path;
    }*/
}