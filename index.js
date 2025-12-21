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


      // user role meantean //
    const verifyAdmin = async (req, res, next) => {
      const email = req.tokenEmail;
      const users = await usersCollection.findOne({ email });
      if (users?.role !== "admin")
        return res
          .status(403)
          .seler({ message: "Admin Only Actions", role: users?.role });
      next();
    };

    const verifyLibrari = async (req, res, next) => {
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

     app.post("/users", async (req, res) => {
      const newUser = req.body;
      newUser.create_date = new Date();
      newUser.last_loggedIn = new Date();
      newUser.role = "customer";
      const query = { email: newUser.email };
      const alreadyExist = await usersCollection.findOne(query);
      if (alreadyExist) {
        const updateUser = await usersCollection.updateOne(query, {
          $set: { last_loggedIn: new Date() },
        });
        return res.send(updateUser);
      }
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });


    // user profile update
    app.patch("/users/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateUser = req.body;
      const updateProfile = { name: updateUser.name, image: updateUser.image };
      const updateDoc = { $set: updateProfile };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Role Update
    app.patch("/user-role", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.body.email;
      const query = { email: email };
      const roleUpdate = req.body;
      const updateDocument = {
        $set: {
          role: roleUpdate.role,
        },
      };
      const result = await usersCollection.updateOne(query, updateDocument);
      res.send(result);
    });





    // books releated api //

     app.get("/books", async (req, res) => {
      const publishBook = "published";
      const search = req.query.search || "";
      const sort = req.query.sort || "";

      let filter = {
        status: publishBook,
      };

      if (search) {
        filter.bookTitle = { $regex: search, $options: "i" };
      }

      let sortOption = {};
      if (sort === "low-high") {
        sortOption = { price: 1 };
      } else if (sort === "high-low") {
        sortOption = { price: -1 };
      } else {
        sortOption = { create_date: -1 };
      }
      const result = await booksCollection
        .find(filter)
        .sort(sortOption)
        .toArray();

      res.send(result);

    });


    app.get("/mange-books", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await booksCollection
        .find()
        .sort({ create_date: -1 })
        .toArray();
      res.send(result);
    });


    app.get(
      "/my-books/:email",
      verifyJWT,
      verifyLibrari,
      async (req, res) => {
        const email = req.params.email;
        const result = await booksCollection
          .find({ authorEmail: email })
          .toArray();
        res.send(result);
      }
    );


    app.get("/books/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await booksCollection.findOne(query);
      res.send(result);
    });


    app.get("/update-book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await booksCollection.findOne(query);
      res.send(result);
    });


    app.post("/books", verifyJWT, verifyLibrari, async (req, res) => {
      const newBook = req.body;
      newBook.create_date = new Date();
      const result = await booksCollection.insertOne(newBook);
      res.send(result);
    });


    app.put("/books/:id", verifyJWT, verifyLibrari, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateBook = req.body;
      const updateDoc = { $set: updateBook };
      const result = await booksCollection.updateOne(query, updateDoc);
      res.send(result);
    });


    app.delete("/books/:id", verifyJWT, verifyLibrari, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const existingData = await booksCollection.findOne(query);
      if (existingData.status === "published") {
        return res.send({ message: "book publish not delete" });
      }
      const result = await booksCollection.deleteOne(query);
      res.send(result);
    });


      // latest books 6 to show home
    app.get("/latest", async (req, res) => {
      const publishBook = "published";
      const result = await booksCollection
        .find({ status: publishBook })
        .sort({ create_date: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });





     

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
