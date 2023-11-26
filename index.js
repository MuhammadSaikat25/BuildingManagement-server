const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(cors());

const VerifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT, (error, decode) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decode = decode;
    next();
  });
};

const { MongoClient, ServerApiVersion, Code } = require("mongodb");
const uri = `mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@cluster0.aezjkqe.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const Apartments = client.db("Building").collection("Apartments");
    const Users = client.db("Building").collection("Users");
    const Agreement = client.db("Building").collection("Agreement");

    app.post("/addUser", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const userExits = await Users.findOne(query);
      if (userExits) {
        return;
      }
      const result = await Users.insertOne(user);
      res.send(result);
    });
    app.post("/agreement", VerifyJwt, async (req, res) => {
      const data = req.body;

      const result = await Agreement.insertOne(data);
      res.send(result);
    });
    // ? get all apartments
    app.get("/apartments", async (req, res) => {
      const result = await Apartments.find().toArray();
      res.send(result);
    });

    // ! get user role
    app.get("/userRoal/:email", VerifyJwt, async (req, res) => {
      const user = req.params.email;
      const query = { email: user };
      const request = await Users.findOne(query);
      res.send(request);
    });
    //! implement jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT, { expiresIn: "1d" });
      res.send({ token });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("WelCome");
});
app.listen(port);
