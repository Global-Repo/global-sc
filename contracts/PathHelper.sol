// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "./IPair.sol";
import "./IPather.sol";
import "./IPathHelper.sol";

contract PathHelper is IPathHelper {
    IPather private MASTER_CHEF;

    address private constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address private constant BUSD = 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56;
    address private constant USDT = 0x55d398326f99059fF775485246999027B3197955;

    constructor(
        address _masterChef
    ) public {
        MASTER_CHEF = IPather(_masterChef);
    }


    function findPath(address _tokenFrom, address _tokenTo) external view override returns (address[] memory)
    {
        address intermediateFrom = MASTER_CHEF.getRouteAddress(_tokenFrom);
        address intermediateTo = MASTER_CHEF.getRouteAddress(_tokenTo);

        address[] memory path;
        if ((intermediateFrom != address(0)||intermediateTo != address(0)) && (_tokenFrom == WBNB || _tokenTo == WBNB)) {
            // [WBNB, BUSD, XXX] or [XXX, BUSD, WBNB] casos en que hi ha un intermig per arribar a WBNB
            path = new address[](3);
            path[0] = _tokenFrom;
            path[1] = intermediateFrom != address(0)?intermediateFrom:intermediateTo;
            path[2] = _tokenTo;
        } else if ((intermediateFrom != address(0) || intermediateTo != address(0)) && (_tokenFrom == intermediateTo || _tokenTo == intermediateFrom)) {
            // [VAI, BUSD] or [BUSD, VAI] casos en que directament l'intermedi de un dels tokens es l'altre token
            path = new address[](2);
            path[0] = _tokenFrom;
            path[1] = _tokenTo;
        } else if ((intermediateFrom != address(0)||intermediateTo != address(0)) && intermediateFrom == intermediateTo) {
            // [VAI, DAI] or [VAI, USDC] casos en que l'intermedi es el mateix pels 2 tokens
            path = new address[](3);
            path[0] = _tokenFrom;
            path[1] = intermediateFrom;
            path[2] = _tokenTo;
        } else if (intermediateFrom != address(0) && intermediateTo != address(0)) {
            // [VAI, BUSD, WBNB, xRoute, xToken] casos en que els 2 tenen intermedis
            path = new address[](5);
            path[0] = _tokenFrom;
            path[1] = intermediateFrom;
            path[2] = WBNB;
            path[3] = intermediateTo;
            path[4] = _tokenTo;
        } else if (intermediateFrom != address(0)) {
            // [VAI, BUSD, WBNB, BUNNY] casos en que nomes el from te intermedi
            path = new address[](4);
            path[0] = _tokenFrom;
            path[1] = intermediateFrom;
            path[2] = WBNB;
            path[3] = _tokenTo;
        } else if (intermediateTo != address(0)) {
            // [BUNNY, WBNB, BUSD, VAI] casos en que nomes el to te intermedi
            path = new address[](4);
            path[0] = _tokenFrom;
            path[1] = WBNB;
            path[2] = intermediateTo;
            path[3] = _tokenTo;
        } else if (_tokenFrom == WBNB || _tokenTo == WBNB) {
            // [WBNB, BUNNY] or [BUNNY, WBNB] casos en que no hi ha intermedi i un dels tokens es directament el WBNB
            path = new address[](2);
            path[0] = _tokenFrom;
            path[1] = _tokenTo;
        } else {
            // [USDT, BUNNY] or [BUNNY, USDT] casos en que no hi ha intermedi per cap dels tokens
            path = new address[](3);
            path[0] = _tokenFrom;
            path[1] = WBNB;
            path[2] = _tokenTo;
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