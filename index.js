const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()

const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000

// middleware
app.use(express.json());
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@project-1.zd08b5r.mongodb.net/?appName=project-1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const db = client.db('book_library_db')
    const usersCollection = db.collection('users')
    const booksCollection = db.collection('books')
    const ordersCollection = db.collection('orders')

    
    //user api
    app.post('/users', async (req, res) => {
    const user = req.body;
    await usersCollection.insertOne(user);
    res.send({ success: true });
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
