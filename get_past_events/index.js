// const { web3 } = require("hardhat");
const Web3 = require("web3");
const abi = require("./abi");

const Web3_bsc = new Web3("https://bsc-dataseed1.binance.org:443");

const ADDRESS = "0x1dF0B759ee5b144852EEb571bbA9CCA2aec66b35";
//const FROM_BLOCK = "18610000";
const FROM_BLOCK = "14185612"; //"18610000";
const TO_BLOCK = "14185912"; //"18615000";
//const TO_BLOCK = "14190612";//"18615000";
//const TO_BLOCK = "18615000";

const contract = new Web3_bsc.eth.Contract(abi, ADDRESS);

async function main() {
  try {
    const events = await contract.getPastEvents(
      "Swap", // "allEvents",
      {
        fromBlock: FROM_BLOCK,
        toBlock: TO_BLOCK,
      }
    );

    //console.log(events);

    for (var i = 0; i < events.length; i++) {
      const timestamp = (await Web3_bsc.eth.getBlock(events[i].blockNumber))
        .timestamp;
      console.log(
        events[i].returnValues.to,
        " on ",
        timestamp,
        " transferred ",
        (Number(events[i].returnValues.amount1In) +
          Number(events[i].returnValues.amount1Out)) /
          1000000000000000000 /*JSON.stringify(events)*/
      );
    }
  } catch (err) {
    console.error("____ ERR", err);
  }
}

main().then(() => {
  console.log("FINISHED !!!");
});

// https://bscscan.com/tx/0xcdceb49c13de0af901b73adacead01b8a877c00b44023459dbc6f8ce736c3a75
