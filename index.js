const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()

const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000

const stripe = require("stripe")(process.env.);

// middleware
app.use(express.json());
app.use(cors())
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    optionSuccessStatus: 200,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@project-1.zd08b5r.mongodb.net/?appName=project-1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const admin = require("firebase-admin");
// firebase  
const decoded = Buffer.from(
  process.env.FIREBASE_SECURE_KEY,
  "base64"
).toString("utf-8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


// jwt
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];

  if (!token) return res.status(401).send({ message: "Unauthorized Accesss!" });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;

    next();
  } catch (err) {
    console.log(err);
    return res.status(401).send({ message: "Unauthorized Accesss!", err });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const db = client.db('book_library_db')
    const usersCollection = db.collection('users')
    const booksCollection = db.collection('books')
    const ordersCollection = db.collection('orders')
    const paymentCollection = db.collection("payments");
    const wishlistCollection = db.collection("wishlists");
    const ratingCollection = db.collection("bookRatings");


      // user role meantean
    const verifyAdmin = async (req, res, next) => {
      const email = req.tokenEmail;
      const users = await usersCollection.findOne({ email });
      if (users?.role !== "admin")
        return res
          .status(403)
          .seler({ message: "Admin Only Actions", role: users?.role });
      next();
    };
    const verifyLibrarian = async (req, res, next) => {
      const email = req.tokenEmail;
      const users = await usersCollection.findOne({ email });
      if (users?.role !== "Librarian")
        return res
          .status(403)
          .seler({ message: "Seller Only Actions", role: users?.role });
      next();
    };

    //user api
    app.get("/all-users/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const adminEmail = req.params.email;
      const result = await usersCollection
        .find({ email: { $ne: adminEmail } })
        .toArray();
      res.send(result);
    });

      //user role
    app.get("/user/role", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ error: "Email is required" });

      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send({ error: "User not found" });

      res.send({ role: user.role });
    });

    app.get("/users/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    


    app.post('/users', async (req, res) => {
    const user = req.body;
    await usersCollection.insertOne(user);
    res.send({ success: true });
   });

  //  app.get('/users/role/:email', async (req, res) => {
  //  const email = req.params.email;
  //  const user = await usersCollection.findOne({ email });
  //  res.send({ role: user?.role || 'user' });
  // });


  app.get("/users/role/:email", async (req, res) => {
  const email = req.query.email;

  const user = await usersCollection.findOne({ email });

  if (!user) {
    return res.status(404).send({ role: "customer" });
  }

  res.send({ role: user.role || "customer" });
});


// GET user by email
app.get("/users/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    res.send(user);
  } catch (error) {
    res.status(500).send({ message: "Server error" });
  }
});


     
    //books api
    app.post('/books', async(req,res) => {
       const newBook = req.body;
       const result = booksCollection.insertOne(newBook);
       res.send(result)
    })

    app.get('/books', async(req,res) => {
     const result = await booksCollection.find().toArray();
     res.send(result);
    })

    //order api 
    app.post('/orders' , async (req, res) =>{
       const order = req.body;
       await ordersCollection.insertOne(order);
       res.send({success: true})
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('book library running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
