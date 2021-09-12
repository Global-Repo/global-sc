// SPDX-License-Identifier: Unlicensed
pragma solidity 0.6.12;

import './IBEP20.sol';
import "./TokenAddresses.sol";
import "./IPathFinder.sol";
import './IPair.sol';

// MC owner of MCInternal
contract MasterChefInternal {
    TokenAddresses public tokenAddresses;

    constructor(address _tokenAddresses) public {
        tokenAddresses = TokenAddresses(_tokenAddresses);
    }

    function checkTokensRoutes(IPathFinder pathFinder, IBEP20 _lpToken) public returns (bool bothConnected)
    {
        address WBNB = tokenAddresses.findByName(tokenAddresses.BNB());
        IPair pair = IPair(address(_lpToken));
        //TODO remove both connected
        bothConnected = false;
        if(pair.token0()==WBNB)
        {
            pathFinder.addRouteInfoDirect(pair.token1());
            bothConnected = true;
        }
        else if(pair.token1()==WBNB)
        {
            pathFinder.addRouteInfoDirect(pair.token0());
            bothConnected = true;
        }
        else if(!pathFinder.isTokenConnected(pair.token0()) && pathFinder.getRouteInfoDirectBNB(pair.token1()))
        {
            pathFinder.addRouteInfoRoute(pair.token0(),pair.token1());
            bothConnected = true;
        }
        else if(!pathFinder.isTokenConnected(pair.token1()) && pathFinder.getRouteInfoDirectBNB(pair.token0()))
        {
            pathFinder.addRouteInfoRoute(pair.token1(),pair.token0());
            bothConnected = true;
        }
        else if(pathFinder.isTokenConnected(pair.token0()) && pathFinder.isTokenConnected(pair.token1()))
        {
            bothConnected = true;
        }
    }
}