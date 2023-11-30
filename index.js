const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(cors());
const stripe = require("stripe")(process.env.Payment_Key);
// console.log(process.env.Payment_Key)

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

const { MongoClient, ServerApiVersion, Code, ObjectId } = require("mongodb");
const e = require("express");
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
    const Coupon = client.db("Building").collection("Coupon");
    const Payment = client.db("Building").collection("Payment");
    // ! add user
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
    // ! VerifyAdmin
    const VerifyAdmin = async (req, res, next) => {
      const email = req.decode.email;
      const query = { email: email };
      const findUser = await Users.findOne(query);
      const admin = findUser.role === "admin";
      if (!admin) {
        return res.status(401).send("forbidden access");
      }
      next();
    };
    // ! add agreement
    app.post("/agreement", VerifyJwt, async (req, res) => {
      const data = req.body;
      const result = await Agreement.insertOne(data);
      res.send(result);
    });
    // ! get all apartments
    app.get("/apartments", async (req, res) => {
      const result = await Apartments.find().toArray();
      res.send(result);
    });
    // ! get all members
    app.get("/allMembers", VerifyJwt, VerifyAdmin, async (req, res) => {
      const query = { role: "member" };
      const result = await Agreement.find(query).toArray();
      res.send(result);
    });
    // ! get all Agreement request
    app.get("/getAgreement", VerifyJwt, VerifyAdmin, async (req, res) => {
      const query = {
        $and: [{ role: "user" }, { status: "pending" }],
      };
      const result = await Agreement.find(query).toArray();
      res.send(result);
    });
    // ! my apartment (member) for payment
    app.get("/myBooking/:email", VerifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = {
        $and: [{ user: email }, { role: "member" }, { status: "checked" }],
      };
      const result = await Agreement.findOne(query);
      res.send(result);
    });
    // ! get user role
    app.get("/userRole/:email", VerifyJwt, async (req, res) => {
      const user = req.params.email;
      const query = { email: user };
      const result = await Users.findOne(query);
      res.send(result);
    });
    // ! get login users agreement request data
    app.get("/userAgreement/:email", VerifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = {
        $and: [{ user: email }, { status: "pending" }],
      };
      const result = await Agreement.find(query).toArray();
      res.send(result);
    });
    // ! get member payment data
    app.get("/getPayment/:email", VerifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await Payment.find(query).toArray();
      res.send(result);
    });
    // ! get payment by month
    app.get("/getPaymentByMonth", VerifyJwt, async (req, res) => {
      const email = req.query.email;
      const month = req.query.month;
      const query = {
        $and: [{ email }, { date: `2023-${month}-30` }],
      };

      const result = await Payment.find(query).toArray();
      res.send(result);
    });
    //! implement jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT, { expiresIn: "1d" });
      res.send({ token });
    });
    // ! add coupon
    app.post("/addCoupon", VerifyJwt, VerifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await Coupon.insertOne(data);
      res.send(result);
    });
    // ! handel user agreements request
    app.patch(
      "/handelAgreement/:id",
      VerifyJwt,
      VerifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            ...data,
          },
        };
        const result = await Agreement.updateOne(query, updateDoc);
        res.send(result);
      }
    );
    // ! remove member and chance role into user
    app.patch("/removeMember/:id", VerifyJwt, VerifyAdmin, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ...data,
        },
      };
      const result = await Agreement.updateOne(query, updateDoc);
      res.send(result);
    });
    // ! user into member when agreements request is accept
    app.patch(
      "/userToMember/:email",
      VerifyJwt,
      VerifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const data = res.body;
        const query = { email: email };
        const updateDoc = {
          $set: {
            ...data,
            role: "member",
          },
        };
        const result = await Users.updateOne(query, updateDoc);
        res.send(result);
      }
    );
    // ! member into user when agreements request is reject
    app.patch(
      "/memberToUser/:email",
      VerifyJwt,
      VerifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const data = res.body;
        const query = { email: email };
        const updateDoc = {
          $set: {
            ...data,
            role: "user",
          },
        };
        const result = await Users.updateOne(query, updateDoc);
        res.send(result);
      }
    );
    // ! payment related api
    app.post("/create-payment-intent", async (req, res) => {
      const { rent } = req.body;
      const amount = parseInt(rent * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
    app.post("/receivePayment", VerifyJwt, async (req, res) => {
      const data = req.body;
      const result = await Payment.insertOne(data);
      res.send(result);
    });
    //! ----------------------------------------------
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
