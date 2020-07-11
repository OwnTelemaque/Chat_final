var createError = require('http-errors');
var express = require('express');
var async = require('async');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');

var passportSocketIo = require("passport.socketio");


//Paquets requis pour l'authentification des utilisateurs
const express_session = require('express-session');
//const { v4: uuidv4 } = require('uuid');       //a virer si je ne genere pas moi meme les ids de session
const session = require('express-session');
const FileStore = require('session-file-store')(express_session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

//On defini combien de message supplementaires on souhaite charger lorsque l'on scroll au max en haut
var nombre_messages_historique = 20;

////////////////////// INITIALISATION DES MODULES //////////////////////////////

// Configuration de passport.js et choix de la strategie
 
var Account = require('./models/account');
var Message = require('./models/message');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());


////////////////////// FIN INITIALISATION MODULES //////////////////////////////

var app = express();


//Utilisation des sessions
var SessionStore = require('session-file-store')(express_session);


//SOCKET.IO
var socketApi = require('./public/javascripts/socketApi');
var io = socketApi.io;
//Liste des utilisateurs connectes
var liste_users = [];




//app.use(cookieParser('keyboard cat'));           //Je l'avais mis au debut pour l'utilisation de flash mais je crois en fait qu'on peut s'en passer. A virer si ok en prod

//Utilisation des sessions
app.use(express_session({
  store: new SessionStore({path: __dirname+'/tmp/sessions'}),
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

app.use(flash());

//Utilisation de passport
app.use(passport.initialize());
app.use(passport.session());


//Permet d'acceder aux sessions de passport dans socket.io
io.use(passportSocketIo.authorize({
  secret:       'keyboard cat',    // the session_secret to parse the cookie
  store:        new SessionStore({path: __dirname+'/tmp/sessions'})
}));



//Connexion a Mongoose
var dev_db_url = 'mongodb+srv://OwnTelemaque:fanette05@nico-4hwvd.azure.mongodb.net/Chat_final?retryWrites=true&w=majority';
var mongoDB = process.env.MONGODB_URI || dev_db_url;

//On se connecte a la base de donnees
mongoose.connect(mongoDB,
{   useNewUrlParser: true,
    useUnifiedTopology: true })
.then(() => console.log('Connexion à MongoDB réussie !'))
.catch(() => console.log('Connexion à MongoDB échouée !'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});






    
io.sockets.on('connection', function(socket){
    
    
    var nom_room = '';
    
    
    
    
    //A la connexion de l'utilisateur
    socket.on('utilisateur_connecte', function(utilisateur) {
        
       console.log('socket.request.user.username: ', socket.request.user.username);
        
        console.log(utilisateur + ' connected');
        //On rajoute son nom dans le tableau des utilisateur connectes
        liste_users.push(utilisateur);
        
        console.log('liste des utilisateurs connectes: ' + liste_users);
        
        socket.emit('liste_utilisateurs_connectes', {liste: liste_users});
        
        
        
        socket.broadcast.emit('nouvel_utilisateur_connecte', {utilisateur: socket.request.user.username, maj: false});
        
        
        
        
    });
    
    
    
    
  
    //Lorsque un utilisateur choisi une room (choisi de converser avec quelqu'un)
    socket.on('ioClient_choix_user', function(pseudo) {
        
        console.log(socket.request.user.username + ' demande de dialoguer avec ' + pseudo);
        
        //Avant de se connecter a la room, si on est deja sur une room, on la quitte proprement avant d'en joindre une autre
        if(nom_room != ''){
            socket.leave(nom_room);
            nom_room = '';
        }
        
        //On cree le nom de la room avec le nom des utilisateur. Pour etre sur que l'on ait le meme nom on le cree avec les 2 noms associes par ordre alphabetique
        if(socket.request.user.username < pseudo){
            nom_room = socket.request.user.username + pseudo;
        }
        else{
            nom_room = pseudo + socket.request.user.username;
        }
        
        console.log('Nom de la room: ', nom_room);
        
        //On rejoint la nouvelle room
        socket.join(nom_room);
        
        
        //On va chercher en BDD l'historique des conversations pour cette room
        Message.find({room_name: nom_room})
        .limit(nombre_messages_historique)
        .sort({'timestamp': -1})
        .populate({ path: 'author', model: 'Account' })
        .populate({ path: 'recipient', model: 'Account' })
        .exec(function (err, liste_messages) {
        if (err) { return next(err); }
        //Successful, so render

        console.log(liste_messages);


        socket.emit('choix_room', {choix_room: nom_room, ami: pseudo, liste_messages: liste_messages});
        });
    });
    
    
    //Mise a jour de la liste d'ami pour l'ami qui vient d'etre ajoute si ce dernier est connecte
    socket.on('maj_liste_ami_ami_ajoute', function(message) {
    
        socket.broadcast.emit('nouvel_utilisateur_connecte', {utilisateur: message.utilisateur, maj: true});
    
    });
    
    
    
    //Lorsqu'un utilisateur scroll les message historiques jusqu'en haut, il faut en rehcarger plus
    socket.on('charger_plus_de_messages', function(message) {
    
    
        
        //On va chercher plus de messages d'historique de conversation en BDD pour cette room
        Message.find({room_name: nom_room})
        .limit(nombre_messages_historique)                                      //Nombre de messages a recuperer
        .skip(message.nombre_total_messages_historiques_charges + nombre_messages_historique)     //On saute les messages qui ont deja ete charges. On prend juste 20 nouveaux
        .sort({'timestamp': -1})
        .populate({ path: 'author', model: 'Account' })
        .populate({ path: 'recipient', model: 'Account' })
        .exec(function (err, liste_messages) {
        if (err) { return next(err); }
        //Successful, so render

        console.log('NOUVEAUX MESSAGES A CHARGER: !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

        console.log(liste_messages);
        //On met a jour le nombre de messages historique qui ont deja ete charges
        var nombre_total_messages_historiques_charges = message.nombre_total_messages_historiques_charges + nombre_messages_historique;
        
        //Si on a moins de messages que ce qui etait prevu, c'est que l'on est arrive en bout de course. Il faut en informe le client pour realiser quelques actions
        if(liste_messages.length != nombre_messages_historique){
            var test_fin = true;
        }
        else{
            var test_fin = false;
        }
        
        socket.emit('nouveaux_messages_historique_a_afficher', {liste_messages: liste_messages, nombre_total_messages_historiques_charges: nombre_total_messages_historiques_charges, test_fin: test_fin });
        });
    
    
    });
    
    
    //Lorsqu'un utilisateur a envoye un message
    socket.on('envoi_message', function(message) {
    
        console.log('le message est: ', message.message);
        
        //Si on est sur une room, on enregistre le message en bdd
        if(nom_room != ''){
            
            console.log('je suis en room donc j\'enregistre en bdd');
            
            //On recupere d'abord l'ID de l'utilisateur et celui de l'ami
            async.parallel({
                utilisateur: function(callback) {
                    Account.findOne({username: message.utilisateur}, '_id')
                    .exec(callback);
                },
                ami: function(callback) {
                  Account.findOne({username: message.ami}, '_id')
                  .exec(callback);
                }
            }, function(err, results) {
                if (err) { return next(err); } // Error in API usage.
                // Successful, so render.
                
                //On prepare notre entree en bdd
                var nouveau_texte = new Message({ author: results.utilisateur,
                                                  recipient: results.ami,
                                                  room_name: nom_room,
                                                  text: message.message,
                                                  timestamp: new Date()
                });
                
                //enregistrement en bdd
                nouveau_texte.save(function (err) {
                    if (err) { return next(err); }
                       console.log('enregistrement en bdd succes');
                });
            });
        }
        //On affiche le message chez le destinataire sans plus attendre
        socket.to(nom_room).emit('reception_message', {message: message.message, utilisateur: message.utilisateur});
    });
    
    
    
    
    //Demande de la liste des utilisateurs connectes
    socket.on('recuperer_liste_utilisateurs_connectes', function() {
        //On repond en envoyant la liste
        socket.emit('liste_utilisateurs_connectes_a_jour', {liste: liste_users});
    });
    
    

    
    
    //Deconnexion de la room pour un retour au chat principal
    socket.on('deco_room', function (message) {
        console.log('sortie de la room. nom_room: ', nom_room);
        socket.leave(message.room);
        nom_room = '';
    });
    
    
    //Deconnexion d'un client
    socket.on('disconnect', function () {

        console.log('On a une deco');
        console.log('la personne deco est: ' + socket.request.user.username);
    
        //Suppression de l'utilisateur de la liste des utilisateurs connectes
        var index_utilisateur_a_supprimer = liste_users.indexOf(socket.request.user.username);
        if(index_utilisateur_a_supprimer != -1){
            liste_users.splice(index_utilisateur_a_supprimer, 1);
        }
        console.log('la nouvelle liste des utilisateurs connectes est: ', liste_users);
        
        socket.broadcast.emit('utilisateur_deconnecte', {utilisateur_deconnecte: socket.request.user.username});
        
        

    });

    
});
    
    
    
    
    
    

module.exports = app;
