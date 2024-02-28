const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const mongoose = require("mongoose");
const Book = require("./schemas/bookSchema");
const Author = require("./schemas/authorSchema");
const User = require("./schemas/userSchema");
const { GraphQLError } = require("graphql");
const jwt = require("jsonwebtoken");
require("dotenv").config();

mongoose.set('strictQuery', false);

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(() => {
  console.log("Connected to MongoDB");
}
).catch((error) => {
  console.log("Error connecting to MongoDB:", error.message);
}
);


/*
  you can remove the placeholder query once your first one has been implemented 
*/

const typeDefs = `
  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type User {
    username: String!
    favouriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type Author {
    name: String!
    born: Int
    bookCount: Int
  }

  type Mutation {
    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]!
    ): Book
    ,
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
  ,
  createUser(
    username: String!
    favouriteGenre: String!
  ): User
  ,
  login(
    username: String!
    password: String!
  ): Token
  }
`;

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    me: (root, args, context) => {
      return context.currentUser;
    },
    allBooks: async (root, args) => {
        if(args.author && args.genre) {
          const author = await Author.findOne({ name: args.author });
          const books = await Book.find({ author: author._id });
          const filteredBooks = books.filter(book => book.genres.includes(args.genre));
          return {
            title: filteredBooks.title,
            published: filteredBooks.published,
            genres: filteredBooks.genres,
            author: {
              name: author.name,
              born: author.born
            }
          }
        }
        else if(args.author) {
          const author = await Author.findOne({ name: args.author });
          const book = await Book.find({ author: author._id });
          return {
            title: book.title,
            published: book.published,
            genres: book.genres,
            author: {
              name: author.name,
              born: author.born
            }
          }
          }
        else if(args.genre) {
          return await Book.find({ genres: { $in: [args.genre] } });
        }
        else {
        const books = await Book.find({});
        const authors = await Author.find({});
        return books.map(book => {
          const author = authors.find(author => author._id.toString() === book.author.toString());
          return {
            title: book.title,
            published: book.published,
            genres: book.genres,
            author: {
              name: author.name,
              born: author.born
            }
          };
      }
      );
    }
    }
    ,
    //Implement BookCount in Author
    allAuthors: async () => {
      const authors = await Author.find({});
      const books = await Book.find({});
      return authors.map(author => {
        const authorBooks = books.filter(book => book.author.toString() === author._id.toString());
        return {
          name: author.name,
          born: author.born,
          bookCount: authorBooks.length
        };
      });
    },
  },

  //Näitä ei ole optimoitu tietokantakyselyjen osalta
  Mutation: {
    addBook: async (root, args, context) => {
      const author = await Author.findOne({ name: args.author });
      if(!context.currentUser) {
        throw new GraphQLError ('Not authenticated');
      }

    //Jos kirjailijaa ei ole olemassa, luodaan uusi
      if(!author) {
        const newAuthor = new Author({ name: args.author });
        try {
          await newAuthor.save();
          const book = new Book({ ...args, author: newAuthor._id});
          await book.save();
          return {
            title: book.title,
            published: book.published,
            genres: book.genres,
            author: {
              name: newAuthor.name
            }
        }
        }
        catch (error) {
          throw new GraphQLError ('Save failed: ', {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args,
              error
            }
          });
        }
      }

      const book = new Book({ ...args, author: author._id });
      try {
        await book.save();
      }
      catch (error) {
        throw new GraphQLError ('Save failed: ', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args,
            error
          }
        });
      }

      return  {
        title: book.title,
        published: book.published,
        genres: book.genres,
        author: {
          name: author.name,
          born: author.born
        }
      };
    },
    editAuthor: async (root, args, context) => {
      const author = await Author.findOne({ name: args.name });
      if(!context.currentUser) {
        throw new GraphQLError ('Not authenticated');
      }
      if(!author) {
        return null;
      }
      author.born = args.setBornTo;
      await author.save();
      return author;
    },
    createUser: (root, args) => {
      const user = new User({ username: args.username, favouriteGenre: args.favouriteGenre });
      return user.save()
      .catch(error => {
        throw new GraphQLError ('Save failed: ', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args,
            error
          }
        });
      });
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if(!user || args.password !== 'secret') {
        throw new GraphQLError ('Invalid username or password');
      }
      const userForToken = {
        username: user.username,
        id: user._id
      };
      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) };
    }
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if(auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), process.env.JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    }
  }
}).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
