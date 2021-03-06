import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';

import booksData from './data/books.json';

// Code for setting up our Mongo database
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/project-mongo";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

// Create Book model to start populating our database
const Book = mongoose.model('Book', {
  bookID: Number,
  title: String,
  authors: String,
  average_rating: Number,
  isbn: String,
  isbn13: Number,
  language_code: String,
  num_pages: Number,
  ratings_count: Number,
  text_reviews_count: Number
});

// Function to start seeding our Database, will only run if
// RESET_DB environment variable is present and is true
if (process.env.RESET_DB) {
  const seedDatabase = async () => {
    // Starts by deleting any pre-existing Book objects to prevent duplicates
    await Book.deleteMany({});
    
    // Creates a new Book instance for each book in the booksData
    booksData.forEach((bookData) => {
      new Book(bookData).save();
    })
  };
  seedDatabase();
};

// Defines the port the app will run on
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(bodyParser.json());

// ROUTES
app.get('/', (req, res) => {
  res.send('Hello world, welcome to Vane Bookish API, now powered by MongoDB!');
});

// Route to get all the books in the database
app.get('/books', async (req, res) => {
  const allBooks = await Book.find();
  res.json(allBooks);
});

// Route to get a single book based on its ID
app.get('/books/book/:bookID', async (req, res) => {
  try {
    const singleBook = await Book.findOne({ bookID: req.params.bookID });

    if (singleBook) {
      res.json(singleBook);
    } else {
      // Error when the book id format is valid, but still no book is found with that id
      res.status(404).json("Sorry, no books found with that ID :(");
    }
  } catch (err) {
    // error when the book id format is wrong, an invalid book id is entered
    res.status(400).json({ error: "Invalid Book ID, double check book id value" });
  }
});

// Route to get books by a specific author
app.get('/books/authors/:authorName', async (req, res) => {
  const paramsAuthorName = req.params.authorName;
  // Added a regex so that it will search non-case-sensitive and if the name is included
  // in the authors string
  const authorBooks = await Book.find({ authors: { $regex : new RegExp(paramsAuthorName, "i") } });
   
  if (authorBooks.length === 0) {
    res.status(404).json("Sorry, could not find any books by thay author, double check author name :(");
  }

  res.json(authorBooks);
});

// Route to get Top Rated books, rating higher or equal to 4
// $gte is MongoDB's comparison query operator for greater or equal to
app.get('/books/top-rated', async (req, res) => {
  const quickReadParam = req.query.quickRead;
  const topBooks = await Book.find({ average_rating: { $gte: 4 } });

  // If the quickRead query param is added, it will show Top Rated books which
  // have less than 600 pages
  if (quickReadParam) {
    const topQuickReadBooks = await Book.find({ average_rating: { $gte: 4 }, num_pages: { $lte: 600 } });
    res.json(topQuickReadBooks);
  }

  res.json(topBooks);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// For this setup to work, two Config Vars need to be added in Heroku:
// MONGO_URL equal to the connection string generated in MongoDB Cloud Atlas
// for this project
// And also RESET_DB with value true has to be added so the seedDatabase function
// is effectively called
