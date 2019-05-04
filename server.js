let express = require('express');
let cors = require('cors');
let app = express();
app.use(cors());
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var jwt = require('jsonwebtoken');
var Movie = require('./Movies');
var Comment = require('./Comments');
mongodb = require('mongodb');
ObjectId = mongodb.ObjectId;

module.exports = app;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
var router = express.Router();
router.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            console.log("Content-Type: " + req.get('Content-Type'));
            res = res.type(req.get('Content-Type'));
        }
        res.send(req.body);
    });

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);
            var userJson = JSON.stringify(user);
            // return that user
            res.json(userJson );
        });
    });

router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            res.json(users);
        });
    });

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please pass username and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err) {
            if (err) {

                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }
            res.json({ success: true, message: 'User created!' });
        });
    }
});

app.route('/movie')
    .get(authJwtController.isAuthenticated, function (req, res) {
        Movie.find(function (err, movie) {
            if(err) res.json({message: "wrong input not working", error: err});
            if (req.query.reviews === 'true'){
                Movie.aggregate([
                    {
                        $lookup:{
                            from: 'comments',
                            localField: 'title',
                            foreignField: 'title',
                            as: 'Reviews'
                        }
                    },
                    {
                        $sort : { averageRating : -1} }

                ],function(err, data) {

                    if(err){
                        res.send(err);
                    }else{
                        res.json(data);
                    }
                });
            } else {
                res.json(movie);
            }
        })
    });

router.route('/Movies/:moviesid')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.moviesid;
        Movie.findById(id, function (err, movie) {
            if (err) res.send(err);
            var movieJson = JSON.stringify(movie);
            res.json(movieJson);
        })
    });

router.route('/MoviesAll')
    .get(authJwtController.isAuthenticated, function (req, res) {
        Movie.find(function (err, movies) {
            if(err) res.send(err);
            res.json(movies);
        })
    });
router.route('/Movies/:id')
    .put(authJwtController.isAuthenticated, function (req, res) {
        var conditions = {_id: req.params.id};
        Movie.updateOne(conditions, req.body)
            .then(mov => {
                if (!mov) {
                    return res.status(404).end();
                }
                return res.status(200).json({msg: "Movie has been updated"})
            })
            .catch(err => next(err))
    });

router.route('/Movies')
    .delete(authJwtController.isAuthenticated, function (req, res){
        Movie.findOneAndDelete({title: req.body.title}, function (err, movie) {
            if (err)
            {
                res.status(400).json({msg: err})
            }
            else if(movie == null)
            {
                res.json({msg : "Movie not found in database"})
            }
            else
                res.json({msg :"The movie has been deleted"})
        })
    });
router.route('/Movies')
    .post(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        var movies = new Movie();
        movies.title = req.body.title;
        movies.YearRelease = req.body.YearRelease;
        movies.genre = req.body.genre;
        movies.Actors = req.body.Actors;
        movies.ImageUrl=req.body.ImageUrl;
        movies.averagerating=req.body.averagerating;
        movies.save(function (err) {
            if (err) {
                if (err.Code == 11000)
                    return res.JSON({success: false, message: 'A movie with that name already exists. '});
                else
                    return res.send(err);
            }
            res.json({success: true, message: 'Movie saved!'})
        });
    });

router.route('/Comments')
    .post(authJwtController.isAuthenticated, function (req, res) {
        var movie = req.body.movie;
        Movie.find(movie, function (err, movieReviews) {
            if(err){
                res.json({msg: "no such a movie in the file.\n"});
            }
            if(movieReviews)
            {
                console.log(req.body);
                var comments = new Comment();
                comments.title = req.body.title;
                comments.comment = req.body.review;
                comments.user = req.body.user;
                comments.rate = req.body.rating;

                comments.save(function (err) {
                    if (err) {
                        if (err.Code == 11000)
                            return res.JSON({success: false, message: 'You have already reviewed this movie try again'});
                        else
                            return res.send(err);
                    }
                    res.json({success: true, message: 'You review has been saved.'})
                });
            }
        });
    });
app.route('/movie/:movieid')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.movieid;
        Movie.findById(id, function (err, movie) {
            if (err) {
                res.json({message: "Movie not found"});
            }
            else {
                if (req.query.reviews === 'true'){

                    Movie.aggregate([
                        {
                            $match: {'title': req.query.title}
                        },

                        {
                            $lookup:{
                                from: 'comments',
                                localField: 'title',
                                foreignField: 'title',
                                as: 'Reviews'
                            }
                        }
                    ],function(err, data) {

                        if(err){
                            res.send(err);
                        }else{
                            res.json(data);
                        }
                    });
                } else {
                    res.json(movie);
                }
            }
        })
    });
router.route('/Movies')
.get(authJwtController.isAuthenticated, function (req, res) {
    let data = req.body;
    if (req.query.reviews === 'true') {
        Movie.aggregate([
            {
                "$match": {"title": data.title}
            },
            {
                $lookup:
                    {
                        from: 'comments',
                        localField: 'title',
                        foreignField: 'title',
                        as: 'reviews'
                    },
            },
        ]).exec((err, review) => {
            if (err) {
                res.status('500').send(err);
            } else {
                res.json(review)
            }
        });
    } else {
        Movie.find(function (err, movies) {
            if (err) {
                res.send(err);
            } else {
                res.json(movies)
            }
        })
    }
})


router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({username: userNew.username}).select('name username password').exec(function (err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function (isMatch) {
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            } else {
                res.status(401).send({success: false, msg: 'Authentication has failed Wrong password try again.'});
            }
        });
    });
    router.all('*', function (res, req) {
        req.json({error: 'Does not support the HTTP method'});
    });
});
app.use('/', router);
app.listen(process.env.PORT || 9090);