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

//resolving requests from the client
wsServer.on("request", (request) => {
  //logic to make a connection to the client
  const connection = request.accept(null, request.origin);
  connection.on("open", () => console.log("opened!"));
  connection.on("close", () => console.log("closed!"));
  /* mapping the function that triggers when the server
   receives a request */
  connection.on("message", (message) => {
    /*parse the data that the server receives which is 
 coming as a JSON object. The data is stored in "result" */
    const result = JSON.parse(message.utf8Data);
    /* when the server receives a create request, the server will
    create a gameId. Based on this gameId, the server stores the game
    as a key in the "games" object with the gameId, 20 balls, 
    and clients  */
    if (result.method === "create") {
      const clientId = result.clientId;
      const gameId = guid();
      games[gameId] = {
        id: gameId,
        balls: 20,
        clients: [],
      };

      /* the server will send a payload that includes the data in the 
      game (id, balls, clients) see above*/
      const payLoad = {
        method: "create",
        game: games[gameId],
      };
      //set up connection to a specific clientId
      const con = clients[clientId].connection;
      //JSON.stringify when sending data. JSON.parse when receiving data
      con.send(JSON.stringify(payLoad));
    }
    // client joins a game
    if (result.method === "join") {
      const clientId = result.clientId;
      const gameId = result.gameId;
      let game = games[gameId];
      //once the game has 3 clients/players, don't do anything
      if (game.clients.length >= 3) {
        return;
      }
      /*if game.clients.length ===0, it will return "Red"
      If game.clients.length === 1, it will return "Green."
      This will set the player's color. */
      const color = { 0: "Red", "1": "Green", "2": "Blue" }[
        game.clients.length
      ];
      /* add this player to the game.clients array. Each player
      has a clientId and color*/
      game.clients.push({
        clientId,
        color,
      });
      /*when there are 3 clients, start the game. After the game
    has started, the server will call updateGameState every time
    it receives a request. */
      if (game.clients.length === 3) {
        updateGameState();
      }
      //the payload includes the game object
      const payLoad = {
        method: "join",
        game,
      };
      //loop through all clients to tell them someone joined
      game.clients.forEach((c) => {
        clients[c.clientId].connection.send(JSON.stringify(payLoad));
      });
    }
    /* if the player clicks on a square ("play" request),
    the server receives the gameId, ballId, and player's color*/
    if (result.method === "play") {
      const gameId = result.gameId;
      const ballId = result.ballId;
      const color = result.color;
      /* create an object called state that stores the colors
      of each ball based on the ballId and the player's color
      sent from the client. Stores the state in the games object
      so when you send the games object back to the client, it will
      contain the state */
      let state = {};
      state[ballId] = color;
      games[gameId].state = state;
    }
  });

  //generate a new clientId
  const clientId = guid();
  clients[clientId] = {
    connection,
  };

  /*upon the initial connection between the server and client,
  the server will send the client a clientId. */
  const payLoad = {
    method: "connect",
    clientId,
  };

  /* This only fires if none of the other request types
  are received. 
  */
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
