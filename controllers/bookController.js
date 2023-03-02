
const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const Bookinstance = require('../models/bookinstance');
const { body, validationResult } = require('express-validator');

const async = require('async');

exports.index = (req, res) => {
    async.parallel(
        {
            book_count(callback) {
                Book.countDocuments({}, callback);
            },
            book_instance_count(callback) {
                Bookinstance.countDocuments({}, callback);
            },
            book_instance_avaliable_count(callback) {
                Bookinstance.countDocuments({ status: 'Avaliable' }, callback);
            },
            author_count(callback) {
                Author.countDocuments({}, callback);
            },
            genre_count(callback) {
                Genre.countDocuments({}, callback);
            }
        },
        (err, results) => {
            res.render('index', {
                title: 'Local Library Home',
                error: err,
                data: results
            });
        }
    );
};

exports.book_list = (req, res, next) => {
    Book.find({}, 'title, author')
        .sort({ title: 1 })
        .populate('author')
        .exec(function (err, list_books) {
            if (err) {
                return next(err);
            }
            res.render('book_list', { title: "Book List", book_list: list_books });
        });
};

exports.book_detail = (req, res, next) => {
    async.parallel(
        {
            book(callback) {
                Book.findById(req.params.id)
                    .populate('author')
                    .populate('genre')
                    .exec(callback);
            },
            book_instance(callback) {
                Bookinstance.find({ book: req.params.id })
                    .exec(callback);
            }
        },
        (err, results) => {
            if (err) {
                return next(err);
            }
            if (results.book == null) {
                const err = new Error('Book not found');
                err.status = 404;
                return next(err);
            }
            res.render('book_detail', {
                title: results.book.title,
                book: results.book,
                book_instances: results.book_instance
            });
        }
    );
};

exports.book_create_get = (req, res, next) => {
    async.parallel({
        authors(callback) {
            Author.find(callback);
        },
        genres(callback) {
            Genre.find(callback);
        }
    },
        (err, results) => {
            /*if (err) {
                return next(err);
            }*/
            res.render('book_form', {
                title: 'Create Book',
                authors: results.authors,
                genres: results.genres
            });
        }
    );
};

exports.book_create_post = [
    (req, res, next) => {
        if (!Array.isArray(req.body.genre)) {
            req.body.genre = typeof req.body.genre === undefined ? [] : [req.body.genre];
        }
        next();
    },
    body('title', 'Title must not be empty')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('author', 'Author must not be empty')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('summary', 'Summary must not be empty')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('isbn', 'Isbn must not be empty')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('genre.*').escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        const book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        });
        if (!errors.isEmpty()) {
            async.parallel(
                {
                    authors(callback) {
                        Author.find(callback);
                    },
                    genres(callback) {
                        Genre.find(callback);
                    }
                },
                (err, results) => {
                    if (err) {
                        return next(err);
                    }
                    for (const genre of results.genres) {
                        if (book.genre.includes(genre._id)) {
                            genre.checked = 'true';
                        }
                    }
                    res.render('book_form', {
                        title: 'Create Book',
                        authors: results.authors,
                        genres: results.genres,
                        book,
                        errors: errors.array()
                    });
                }
            );
            return;
        }
        book.save((err) => {
            if (err) {
                return next(err);
            }
            res.redirect(book.url);
        });
    }
];

exports.book_delete_get = (req, res) => {
    res.send('NOT IMPLIMENTED: Book delete GET');
};

exports.book_delete_post = (req, res) => {
    res.send('NOT IMPLIMENTED: Book delete POST');
};

// Display book update form on GET.
exports.book_update_get = (req, res, next) => {
    // Get book, authors and genres for form.
    async.parallel(
        {
            book(callback) {
                Book.findById(req.params.id)
                    .populate("author")
                    .populate("genre")
                    .exec(callback);
            },
            authors(callback) {
                Author.find(callback);
            },
            genres(callback) {
                Genre.find(callback);
            },
        },
        (err, results) => {
            if (err) {
                return next(err);
            }
            if (results.book == null) {
                // No results.
                const err = new Error("Book not found");
                err.status = 404;
                return next(err);
            }
            // Success.
            // Mark our selected genres as checked.
            for (const genre of results.genres) {
                for (const bookGenre of results.book.genre) {
                    if (genre._id.toString() === bookGenre._id.toString()) {
                        genre.checked = "true";
                    }
                }
            }
            res.render("book_form", {
                title: "Update Book",
                authors: results.authors,
                genres: results.genres,
                book: results.book,
            });
        }
    );
};

// Handle book update on POST.
exports.book_update_post = [
    // Convert the genre to an array
    (req, res, next) => {
        if (!Array.isArray(req.body.genre)) {
            req.body.genre =
                typeof req.body.genre === "undefined" ? [] : [req.body.genre];
        }
        next();
    },

    // Validate and sanitize fields.
    body("title", "Title must not be empty.")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("author", "Author must not be empty.")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("summary", "Summary must not be empty.")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
    body("genre.*").escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {
        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        const book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
            _id: req.params.id, //This is required, or a new ID will be assigned!
        });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel(
                {
                    authors(callback) {
                        Author.find(callback);
                    },
                    genres(callback) {
                        Genre.find(callback);
                    },
                },
                (err, results) => {
                    if (err) {
                        return next(err);
                    }

                    // Mark our selected genres as checked.
                    for (const genre of results.genres) {
                        if (book.genre.includes(genre._id)) {
                            genre.checked = "true";
                        }
                    }
                    res.render("book_form", {
                        title: "Update Book",
                        authors: results.authors,
                        genres: results.genres,
                        book,
                        errors: errors.array(),
                    });
                }
            );
            return;
        }

        // Data from form is valid. Update the record.
        Book.findByIdAndUpdate(req.params.id, book, (err, thebook) => {
            if (err) {
                return next(err);
            }

            // Successful: redirect to book detail page.
            res.redirect(thebook.url);
        });
    },
];




