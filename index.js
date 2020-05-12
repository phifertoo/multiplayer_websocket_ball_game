//websocket is an upgraded http connection

//server frontend
const app = require("express")();
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
app.listen(9091, () => console.log("listening on port 9091"));

//build an http server
const http = require("http");
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log("listening on 9090"));

//hashmaps
const clients = {};
const games = {};

//create websocket server
const webSocketServer = require("websocket").server;
const wsServer = new webSocketServer({
  httpServer: httpServer,
});

wsServer.on("request", (request) => {
  //connecting from the client
  const connection = request.accept(null, request.origin);
  connection.on("open", () => console.log("opened!"));
  connection.on("close", () => console.log("closed!"));
  connection.on("message", (message) => {
    //data that the server receives which is coming as a JSON object
    const result = JSON.parse(message.utf8Data);
    if (result.method === "create") {
      const clientId = result.clientId;
      const gameId = guid();
      games[gameId] = {
        id: gameId,
        balls: 20,
        clients: [],
      };

      //send payload to client
      const payLoad = {
        method: "create",
        game: games[gameId],
      };
      const con = clients[clientId].connection;
      //JSON.stringify when sending data. JSON.parse when receiving data
      con.send(JSON.stringify(payLoad));
    }
    // client joins a game
    if (result.method === "join") {
      const clientId = result.clientId;
      const gameId = result.gameId;
      let game = games[gameId];
      if (game.clients.length >= 3) {
        return;
      }
      /*if game.clients.length ===0, it will return "Red"
      If game.clients.length === 1, it will return "Green"*/
      const color = { 0: "Red", "1": "Green", "2": "Blue" }[
        game.clients.length
      ];
      game.clients.push({
        clientId,
        color,
      });
      //when there are 3 clients, start the game.
      if (game.clients.length === 3) {
        updateGameState();
      }
      const payLoad = {
        method: "join",
        game,
      };
      //loop through all clients to tell them someone joined
      game.clients.forEach((c) => {
        clients[c.clientId].connection.send(JSON.stringify(payLoad));
      });
    }
    if (result.method === "play") {
      const clientId = result.clientId;
      const gameId = result.gameId;
      const ballId = result.ballId;
      const color = result.color;
      let state = games[gameId].state;
      if (!state) {
        state = {};
      }
      state[ballId] = color;
      games[gameId].state = state;
    }
  });

  //generate a new clientId
  const clientId = guid();
  clients[clientId] = {
    connection: connection,
  };

  //send response to client
  const payLoad = {
    method: "connect",
    clientId: clientId,
  };

  connection.send(JSON.stringify(payLoad));
});

function updateGameState() {
  //send updated state to all the clients
  for (const g of Object.keys(games)) {
    const game = games[g];
    const payLoad = {
      method: "update",
      game,
    };
    game.clients.forEach((c) => {
      clients[c.clientId].connection.send(JSON.stringify(payLoad));
    });
  }
  setTimeout(updateGameState, 500);
}

function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// then to call it, plus stitch in '4' in the third group
const guid = () =>
  (
    S4() +
    S4() +
    "-" +
    S4() +
    "-4" +
    S4().substr(0, 3) +
    "-" +
    S4() +
    "-" +
    S4() +
    S4() +
    S4()
  ).toLowerCase();
