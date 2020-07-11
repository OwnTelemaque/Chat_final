//var async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
var Account = require('../models/account');
var Friend_request = require('../models/friend_request');
var async = require('async');
var passport = require('passport');


exports.index = function(req, res) {
    

    //Si on a pas de session de connection, un utilisateur doit se connecter
    if (!req.user) {
        //On l'envoi donc sur la page de login
         res.render('login.pug');
         
    //Si on a une session ouvert
    } else {
    
        console.log('req.user: ', req.user.username);
        
        //je mets mon nom d'utilisateur dans la session SOCKET.IO
        req.session.username = req.query.username;
        
        
        //Requete en base de donnee pour recuperer la liste des amis
        Account.findOne({ username: req.user.username})
        .populate({path: 'friends', options: { sort: { 'username': 1 } } })     //remplace les id par toutes les infos et on tri par nom d'utilisateur
        .populate({ path: 'pending_demands', model: 'Friend_request' })
        .exec(function (err, result) {
            if (err) { return next(err); }

            //console.log('liste amis: ', result.friends[0].username);
            //console.log('pending: ', result);

            //On affiche la page d'accueil avec la liste d'amis de l'utilisateur
            res.render('client.pug', {nom_utilisateur: req.user, test: 'oui', liste_amis: result.friends, pending_demands: result.pending_demands});
        });
    }
};



//Pour la methode GET - on affiche la page de login
exports.loginGET = function(req, res, next) {
    
    console.log('je redirige vers la page de login suite a fail de login');
    
    //J'utilise le module flah pour afficher le message d'erreur defini dans failureFlash. Cela recupere le message genere par la strategie de connexion dans la clef 'error'
    //Il semble que des que l'on accede a la variable stockee dans la session la valeur est automatiquement detruite apres. (ne pas faire de console.log avant son utilisation donc)
    res.render('login.pug', { messages: req.flash('error') });
};




//Pour la methode POST
//Utiliser un tableau me permet d'effectuer dans un premier temps la methode authenticate avant de passer a la suite
exports.loginPOST = [
    
    //passport s'occupe de tester l'autentification
    passport.authenticate('local', { successRedirect: '/',                      //Success, on redirige vers la page d'accueil
                                   failureRedirect: '/login',                   //Fail, on renvoi vers la page de login avec un message d'erreur defini a la ligne ci-dessous
                                   failureFlash: 'Identifiants incorrects' }),  //Utilisation du module flash pour stocker le message d'erreur en session. (Plus supporte nativement dans express depuis la version 3)
    
    //Ces lignes semblent innutiles....
    (req, res, next)  => {
    
        console.log('AUTHENTIFICATION');
    }
];


//Creation d'un nouvel utilisateur en base de donnee
exports.registerPOST = [

    body('username').isLength({ min: 3 }).trim().withMessage('Le nom d\'utilisateur doit avoir au moins 3 caracteres')
                    .isLength({ max: 20 }).trim().withMessage('Le nom d\'utilisateur ne peut pas contenir plus de 20 caracteres')
                    .isAlphanumeric().withMessage('Le nom ne doit comporter que des caracteres alphanumeriques.'),
    body('password').isLength({ min: 6 }).trim().withMessage('Le mot de passe doit avoir au moins 6 caracteres'), 

    // Sanitize fields.
    sanitizeBody('username').escape(),
    sanitizeBody('password').escape(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {
        
        //Traitement sur le nom d'utilisateur pour s'assurer qu'il soit avec une majuscule en premiere lettre uniquement
        var username_lower = req.body.username.toLowerCase();    //on met tout en minuscule dans un premier temps
        req.body.username = premiere_lettre_MAJ(username_lower); //On passe la premiere lettre en majuscule
        
        // Extract the validation errors from a request. - On recupere dans un nouveau tableau uniquement la liste des objets qui font l'objet d'une erreur
        var errors_reformate = validationResult(req).array();
        
        //On execute notre recherche en callback pour avoir le resultat avant de passer a la verification des erreurs
        Account.find({ 'username': req.body.username })
            .exec(function (err, result) {
            if (err) { return next(err); }

            //Si il existe deja un utilisateur avec ce nom
            if(result != ''){
                //On ajoute une erreur dans notre variable de gestion d'erreurs
                errors_reformate.push({msg: 'Cet utilisateur existe deja'});
            }
            //Si on a des erreurs (formulaire mal rempli ou utilisateur deja existant)
            if (errors_reformate != '') {

                //On re-affcihe le formulaire avec les donnees pre-remplies
                res.render('login.pug', {nom_utilisateur: req.body, errors: errors_reformate });
                return;
            }
            //Si il n'y a pas d'erreur on enregistre en BDD
            else {

                console.log('les donnes sont conformes. On enregistre en bdd');
                //passport-local-mongoose s'occupe de l'insertion en bdd avec notre model - Note que je stocke aussi une version du nom d'utilisateur en minuscule pour me simplifier les recherches en bdd plus tard
                Account.register(new Account({ username : req.body.username, username_lower : username_lower }), req.body.password, function(err, account) {
                    if (err) {
                        return res.render('login.pug', { error : err.message });
                    }
                    //Authentification de l'utilisateur si l'insertion en bdd s'est bien passee
                    passport.authenticate('local')(req, res, function () {
                        req.session.save(function (err) {
                            if (err) {
                                return next(err);
                            }
                            //Une fois authentifie on renvoie sur la page d'acceuil
                            res.redirect('/');
                        });
                    });
                });
            }
        });
    }
]

//Methode GET DECO
exports.logout = function(req, res) {

    

    console.log("req.session.passport est; ", req.session.passport);
    console.log("type de req.session.passport; ", typeof req.session.passport);

    
    
    req.logout();
    res.redirect('/');
  
};





//Methode GET recherche ami
exports.rechercheGET = function(req, res) {
    
    //console.log('valeur de la recherche: ', req.query.ami_recherche);
    
    //On s'assure que l'on ne va pas afficher des amis que l'on a deja ni notre propre nom si la recherche venait a le trouver
    //On fait donc une recherche sur nos amis que l'on possede deja et les amis trouves par la recherche. Ces 2 requetes sont faites en paralelle et une fois qu'elles sont toutes 2 finies, on passe a la callback
    async.parallel({
        
        liste_amis_actuelle: function(callback) {   
    
            //Requete en base de donnee pour recuperer la liste des amis
            Account.findOne({ username: req.user.username})
            .populate({path: 'friends', options: { sort: { 'username': 1 } } })     //remplace les id par toutes les infos et on tri par nom d'utilisateur
            //.populate({path: 'pending_demands'})
            .populate({path: 'pending_demands', populate: { path: 'account_requested' }})
            .populate({path: 'pending_demands', populate: { path: 'account_requesting' }})
            .exec(callback);
        },
        liste_amis_recherche: function(callback) {
        
            req.query.ami_recherche = req.query.ami_recherche.toLowerCase();    //on met tout en minuscule dans un premier temps pour rechercher sur le champs sur lequel l'utilisateur est stocke en minuscules
   
            Account.find({ 'username_lower': { "$regex": req.query.ami_recherche, "$options": "i" }}).sort({username:1})   //Une regex pour rechercher un morceau de nom d'utilisateur puis un tri des ami par ordre alphabetique
            .exec(callback);
        }
        }, 
        //La callback nous permet de comparer les 2 recherches
        function(err, result) {
        if (err) { return next(err); }

        //Si il n'y a pas d'erreur on envoi les resultats au client au format JSON (attente retour de la requete XHR)
        else {

            //console.log('nb entrees liste_amis_recherche: ' , result.liste_amis_recherche.length);
            //console.log('resultat liste_amis_actuelle: ' , result.liste_amis_actuelle.friends);
            //console.log('resultat liste_amis_recherche: ' , result.liste_amis_recherche);
            
            //On recupere nos variables dans 2 tableau que l'on va ensuite comparer
            let tab_liste_amis_actuelle = [];
            let tab_liste_amis_recherche = [];
            let tab_liste_amis_a_afficher = [];
            
            //Un nouveau tableau pour la liste d'amis actuelle
            for(let i = 0; i < result.liste_amis_actuelle.friends.length; i++){
                tab_liste_amis_actuelle.push(result.liste_amis_actuelle.friends[i].username);
            }
            //console.log('new tab liste_amis_actuelle: ', tab_liste_amis_actuelle);
            
            //Un nouveau tableau pour les amis trouves lors de la recherche - On en profite pour s'assurer que l'on exclut le nom de l'utilisateur si celui-ci venait a apparaitre dans le resultat
            for(let i = 0; i < result.liste_amis_recherche.length; i++){
                if(result.liste_amis_recherche[i].username != req.user.username){
                    tab_liste_amis_recherche.push({username: result.liste_amis_recherche[i].username, _id: result.liste_amis_recherche[i]._id});
                }
            }
            //console.log('new tab tab_liste_amis_recherche: ', tab_liste_amis_recherche);
            
            //On compare les 2 tableau et on cree notre tableau de sorti avec les amis trouves qui ne sont pas encore dans la liste d'ami de l'utilisateur
            for(let i = 0; i < tab_liste_amis_recherche.length; i++){
                
                let found = tab_liste_amis_actuelle.find(element => element == tab_liste_amis_recherche[i].username);
                if(found === undefined){
                    tab_liste_amis_a_afficher.push({username: tab_liste_amis_recherche[i].username, _id: tab_liste_amis_recherche[i]._id});
                }
            }
            
            //console.log('Pending request envoyees par l\'utilisateur: ', result.liste_amis_actuelle.pending_demands);
     
            //On met dans un tableau tous les amis a qui on a fait une demande et qui n'ont pas encore accepte pour les empecher d'etre cliquables a l'affichage
            var liste_amis_pending_a_ne_pas_cliquer = [];
            for (let i = 0; i < result.liste_amis_actuelle.pending_demands.length; i++){
                
                //console.log('result.liste_amis_actuelle.pending_demands[i].account_requesting: ', result.liste_amis_actuelle.pending_demands[i].account_requesting[0].username);
                //console.log('result.liste_amis_actuelle.pending_demands[i].account_requesting: ', result.liste_amis_actuelle.pending_demands[i].account_requested[0].username);
                //console.log('result.liste_amis_actuelle._id: ', result.liste_amis_actuelle.username);
                
                if (result.liste_amis_actuelle.pending_demands[i].account_requesting[0].username === result.liste_amis_actuelle.username){
                    
                    liste_amis_pending_a_ne_pas_cliquer.push(result.liste_amis_actuelle.pending_demands[i].account_requested[0].username);
                    //console.log("ID ami requested: ", result.liste_amis_actuelle.pending_demands[i]._id);
                    //console.log("Nom ami requested: ", result.liste_amis_actuelle.pending_demands[i].account_requesting[0].username);
                }
            }
            console.log(liste_amis_pending_a_ne_pas_cliquer);
            
            //console.log('liste nouveaux amis trouves a afficher: ', tab_liste_amis_a_afficher);
            
            //On envoi le resultat de la requet xhr 'xhr_recherche_ami' au format JSON
            res.json({ liste_amis_JSON: tab_liste_amis_a_afficher, pending_demands: liste_amis_pending_a_ne_pas_cliquer });
        }
    });
};



//Methode POST ajout ami
exports.ajout_amiPOST = function(req, res) {

    console.log('ajout ami id: ', req.body.ami_ajoute);
    console.log('ajout ami username: ', req.body.ami_ajoute_username);
    console.log('req.body.name est: ', req.user.username);
    
    
    
    //On recupere les infos de l'utilisateur
    Account.findOne({ 'username': req.user.username })
    .populate({path: 'friends'})
    .populate({path: 'pending_demands'})
    .exec( function(err, compte_utilisateur) {
        if (err) { return next(err); }
        else{

            console.log("Nom utilisateur: ", compte_utilisateur.username);

            //On prepare notre nouvelle requete d'ami
            var friend_request = new Friend_request(
                {account_requesting: compte_utilisateur._id,
                account_requested: req.body.ami_ajoute,
                status: 'pending'}
            );


            //On test avant de creer qu'il n'existe pas deja la meme requete
            var test_pending_exists = false;
            var id_pending_demand_deja_existante = '';
            for (let i = 0; i < compte_utilisateur.pending_demands.length; i++){
                //Si on a deja une demande pending emanant du meme ami
                if (compte_utilisateur.pending_demands[i].account_requesting == req.body.ami_ajoute){
                    test_pending_exists = true;
                    id_pending_demand_deja_existante = compte_utilisateur.pending_demands[i]._id;
                } 
            }
            console.log('test_pending_exists: ', test_pending_exists);
            
            //Si la demande n'a pas deja ete faite...
            if(test_pending_exists === false){
              
                console.log('je suis dans le false');
              
                //On cree notre nouvelle requete    -  Callback car je dois avoir l'id de la nouvelle requete pour pouvoir l'ajouter sur le compte de l'utilisateur
                friend_request.save(function (err, nouvelle_requete) {
                    if (err) { return next(err); }

                    //console.log('nouvelle requete: ', nouvelle_requete);

                    //On ajoute une nouvelle requete pending chez l'ami a qui on a fait la demande

                    //On recupere les pending demands potentiellement deja presentes
                    Account.findOne({ 'username': req.body.ami_ajoute_username })
                    .populate({path: 'friends'})
                    .populate({path: 'pending_demands'})
                    .exec( function(err, compte_ami) {
                        if (err) { return next(err); }
                        else{
                            //On update le champs pending demand de l'ami
                            var tab_pending_demands_ami = compte_ami.pending_demands;
                            tab_pending_demands_ami.push(nouvelle_requete._id);

                            Account.findByIdAndUpdate(compte_ami._id, { pending_demands: tab_pending_demands_ami}, function (err) {
                                if (err) { return next(err); }

                                //On update le champs pending demand de l'utilisateur
                                var tab_pending_demands_utilisateur = compte_utilisateur.pending_demands;
                                tab_pending_demands_utilisateur.push(nouvelle_requete._id);

                                Account.findByIdAndUpdate(compte_utilisateur._id, { pending_demands: tab_pending_demands_utilisateur }, function (err) {
                                    if (err) { return next(err); }

                                    //On recupere les infos a jour pour les envoyer au client. - En callback donc pour etre sur d'avoir termine les traitements avant
                                    Account.findOne({ username: req.user.username}).sort({friends:1})
                                    .populate({path: 'friends', options: { sort: { 'username': 1 } } })
                                    .populate({path: 'pending_demands', populate: { path: 'account_requested' }})
                                    .populate({path: 'pending_demands', populate: { path: 'account_requesting' }})
                                    .exec(function (err, result) {
                                        if (err) { return next(err); }


                                        //On met dans un tableau tous les amis a qui on a fait une demande et qui n'ont pas encore accepte pour les empecher d'etre cliquables a l'affichage
                                        var liste_amis_pending_a_ne_pas_cliquer = [];
                                        for (let i = 0; i < result.pending_demands.length; i++){

                                            //console.log('result.pending_demands[i].account_requesting: ', result.pending_demands[i].account_requesting[0].username);
                                            //console.log('result.pending_demands[i].account_requesting: ', result.pending_demands[i].account_requested[0].username);
                                            //console.log('result._id: ', result.username);

                                            if (result.pending_demands[i].account_requesting[0].username === result.username){

                                                liste_amis_pending_a_ne_pas_cliquer.push(result.pending_demands[i].account_requested[0].username);
                                                //console.log("ID ami requested: ", result.pending_demands[i]._id);
                                                //console.log("Nom ami requested: ", result.pending_demands[i].account_requesting[0].username);
                                            }
                                        }

                                        console.log('liste_amis_pending_a_ne_pas_cliquer: ', liste_amis_pending_a_ne_pas_cliquer);
                                        console.log("AMI AJOUTE: ", req.body.ami_ajoute);
                                        //On a besoin en plus de la variable ami_ajoute_username (nom complet de l'ami ajoute) pour pouvoir le supprimer de la liste des resultat de recherche une fois ajoute + de la variables des amis pending a ne pas rendre cliquables
                                        res.json({ test_ajout: 'true', liste_amis_utilisateur_JSON: result, ami_ajoute: req.body.ami_ajoute_username, pending_demands: liste_amis_pending_a_ne_pas_cliquer });
                                    });
                                });
                            });
                        }
                    });
                });
            }
            //Si la demande existe deja au cas ou les 2 utilisateurs aient fait la demande au meme moment
            else{
                //On realise l'ajout sans creer de nouvelle friend request - Update des comptes

                console.log('je suis dans le true');

                //Une waterfall car on est dependant de la reponse d'une requete avant de passer aux suivante
                async.waterfall([

                    //On recupere les infos de la pending demand (On en a besoin pour la suite)
                    function(callback) {
                        Friend_request.findOne({_id: id_pending_demand_deja_existante})
                        .exec(function (err, id_pending) {
                            if (err) { return next(err); }
                            callback(null, id_pending);
                        });
                    },
                    //On les transmet pour mettre a jour nos comptes
                    function(id_pending, callback) {

                        //On lance la mise a jour du compte qui recoit la demande
                        Account.findOne({_id: id_pending.account_requested})
                        .exec(function (err, account_requested) {
                            if (err) { return next(err); }

                            //On met a jour sa liste d'amis
                            var nouvelle_liste_amis = account_requested.friends;
                            nouvelle_liste_amis.push(id_pending.account_requesting);

                            //On met a jour sa pending demand
                            var nouvelle_pending_demand_requested = account_requested.pending_demands;
                            nouvelle_pending_demand_requested.forEach(function(item, index, tableau){

                                //console.log('item: ', item);
                                //console.log('id_pending: ', id_pending_demand_deja_existante);
                                //console.log('string item: ', String(item));
                                //console.log('string id_pending: ', String(id_pending_demand_deja_existante));
                                
                                //console.log('typeof item: ', typeof item);    //typeof est string
                                //console.log('typeof id_pending: ', typeof id_pending_demand_deja_existante);    //typeof est object

                                console.log('tableau avant spliceee: ', nouvelle_pending_demand_requested);
                                if (String(item) === String(id_pending_demand_deja_existante)) {    //Je ne sais pas trop pk j'ai du convertir en str pour valider la condition
                                    console.log('on vire du tableau');
                                    tableau.splice(index, 1);
                                }
                                console.log('tableau apres spliceee: ', nouvelle_pending_demand_requested);
                            });

                            console.log('nouvelle_pending_demand_requested: ', nouvelle_pending_demand_requested);

                            //Mise a jour en bdd
                            Account.findByIdAndUpdate(id_pending.account_requested, { friends: nouvelle_liste_amis, pending_demands: nouvelle_pending_demand_requested}, function (err) {
                            if (err) { return next(err); }

                                //Un fois l'update effectue on recupere la liste d'ami du compte mise a jour pour l'envoyer a la sortie de la waterfall
                                Account.findOne({_id: id_pending.account_requested}, 'friends' )
                                .populate({path: 'friends', options: { sort: { 'username': 1 } } })     //remplace les id par toutes les infos et on tri par nom d'utilisateur
                                .exec(function (err, account_requested_liste_amis) {
                                    if (err) { return next(err); }
                                    //ICI envoi de la valeur de retour de la callback
                                    callback(null, account_requested_liste_amis);
                                });
                            });
                        });

                        //On fait de meme pour le compte qui envoi la demande
                        Account.findOne({_id: id_pending.account_requesting})
                        .exec(function (err, account_requesting) {
                            if (err) { return next(err); }

                            //On met a jour sa liste d'amis
                            var nouvelle_liste_amis = account_requesting.friends;
                            nouvelle_liste_amis.push(id_pending.account_requested);

                            //On met a jour sa pending demand
                            var nouvelle_pending_demand_requesting = account_requesting.pending_demands;
                            nouvelle_pending_demand_requesting.forEach(function(item, index, tableau){
                                if (String(item) === String(id_pending_demand_deja_existante)) {
                                tableau.splice(index, 1);
                                }
                            });

                            //Mise a jour en bdd
                            Account.findByIdAndUpdate(id_pending.account_requesting, { friends: nouvelle_liste_amis, pending_demands: nouvelle_pending_demand_requesting}, function (err) {
                            if (err) { return next(err); }
                            });
                        });

                        //On met a jour la friend request
                        Friend_request.findByIdAndUpdate(id_pending_demand_deja_existante, { status: 'accepted' }, function (err) {
                        if (err) { return next(err); }
                        });
                    }
                ], 
                //Une fois les traitements termines, on affiche la reponse
                function (err, result) {
                    if (err) { return next(err); }
                    //Ce qu'on doit faire apres que la BDD ait ete mise a jour - envoi des amis a jour pour les re-afficher
                    console.log("Je recupere la liste d\'amis mise a jour: ", result);
                    
                    //On recupere les infos a jour pour les envoyer au client. - En callback donc pour etre sur d'avoir termine les traitements avant
                    Account.findOne({ username: req.user.username}).sort({friends:1})
                    .populate({path: 'friends', options: { sort: { 'username': 1 } } })
                    .populate({path: 'pending_demands', populate: { path: 'account_requested' }})
                    .populate({path: 'pending_demands', populate: { path: 'account_requesting' }})
                    .exec(function (err, result) {
                        if (err) { return next(err); }


                        //On met dans un tableau tous les amis a qui on a fait une demande et qui n'ont pas encore accepte pour les empecher d'etre cliquables a l'affichage
                        var liste_amis_pending_a_ne_pas_cliquer = [];
                        for (let i = 0; i < result.pending_demands.length; i++){

                            //console.log('result.pending_demands[i].account_requesting: ', result.pending_demands[i].account_requesting[0].username);
                            //console.log('result.pending_demands[i].account_requesting: ', result.pending_demands[i].account_requested[0].username);
                            //console.log('result._id: ', result.username);

                            if (result.pending_demands[i].account_requesting[0].username === result.username){

                                liste_amis_pending_a_ne_pas_cliquer.push(result.pending_demands[i].account_requested[0].username);
                                //console.log("ID ami requested: ", result.pending_demands[i]._id);
                                //console.log("Nom ami requested: ", result.pending_demands[i].account_requesting[0].username);
                            }
                        }
                        console.log('liste_amis_pending_a_ne_pas_cliquer: ', liste_amis_pending_a_ne_pas_cliquer);
                        console.log("AMI AJOUTE: ", req.body.ami_ajoute);
                        //On a besoin en plus de la variable ami_ajoute_username (nom complet de l'ami ajoute) pour pouvoir le supprimer de la liste des resultat de recherche une fois ajoute + de la variables des amis pending a ne pas rendre cliquables
                        res.json({ test_ajout: 'false', liste_amis_utilisateur_JSON: result, ami_ajoute: req.body.ami_ajoute_username, pending_demands: liste_amis_pending_a_ne_pas_cliquer });
                    });
                });
            }
        }
    }); 
};



//Recuperation des demandes d'ami pending
exports.get_pendingGET = function(req, res) {
    
    console.log('get pending pour: ', req.user.username);
    
    var tab_liste_requetes_pending = [];
  
    Account.findOne({ 'username': req.user.username })
    
    .populate({path: 'pending_demands', populate: { path: 'account_requesting' }})
    .exec( function(err, compte_utilisateur) {
        if (err) { return next(err); }
        else{
            
            //On prepare un tableau avec la liste de toutes les demandes d'ami pour notre utilisateur stockees sous forme d'objet.
            for (let i = 0; i < compte_utilisateur.pending_demands.length; i++){
                //Si la pending_demand n'emmane pas de l'utilisateur actuel
                if (compte_utilisateur.pending_demands[i].account_requesting[0].username != compte_utilisateur.username){
                    //On rajoute un objet dans le tableau avec les infos de la demande a traiter
                    var infos = {
                                id_pending: String(compte_utilisateur.pending_demands[i]._id),
                                id_account_requesting: String(compte_utilisateur.pending_demands[i].account_requesting[0]._id),
                                username_account_requesting: String(compte_utilisateur.pending_demands[i].account_requesting[0].username)
                                };
                    tab_liste_requetes_pending.push(infos);
                    }
                }
            
            //console.log("resultat compte_utilisateur: ", compte_utilisateur);
            //console.log("compte_utilisateur.pending_demands.account_requesting: ", compte_utilisateur.pending_demands[0].account_requesting[0].username);
            
            console.log('Variable envoyee: ', tab_liste_requetes_pending);
            
            res.json({ liste_pendings: tab_liste_requetes_pending});
        }
    });
};




//Methode POST accepter ami
exports.accepter_amiPOST = function(req, res) {

    console.log('L\'id de la pending demand a traiter est: ', req.body.id_pending_demand);

    //Une waterfall car on est dependant de la reponse d'une requete avant de passer aux suivante
    async.waterfall([
            
            //On recupere les infos de la pending demand (On en a besoin pour la suite)
            function(callback) {
                Friend_request.findOne({_id: req.body.id_pending_demand})
                .exec(function (err, id_pending) {
                    if (err) { return next(err); }
                    callback(null, id_pending);
                });
            },
            //On les transmet pour mettre a jour nos comptes
            function(id_pending, callback) {
                
                //On lance la mise a jour du compte qui recoit la demande
                Account.findOne({_id: id_pending.account_requested})
                .exec(function (err, account_requested) {
                    if (err) { return next(err); }
                
                    //On met a jour sa liste d'amis
                    var nouvelle_liste_amis = account_requested.friends;
                    nouvelle_liste_amis.push(id_pending.account_requesting);
                    
                    //On met a jour sa pending demand
                    var nouvelle_pending_demand_requested = account_requested.pending_demands;
                    nouvelle_pending_demand_requested.forEach(function(item, index, tableau){
                        
                        //console.log('item: ', item);
                        //console.log('id_pending: ', req.body.id_pending_demand);
                        //console.log('typeof item: ', typeof item);    //typeof est string
                        //console.log('typeof id_pending: ', typeof req.body.id_pending_demand);    //typeof est object
                        
                        console.log('tableau avant splice: ', nouvelle_pending_demand_requested);
                        if (item == req.body.id_pending_demand) {
                            console.log('on vire du tableau');
                            tableau.splice(index, 1);
                        }
                        console.log('tableau apres splice: ', nouvelle_pending_demand_requested);
                    });
                    
                    console.log('nouvelle_pending_demand_requested: ', nouvelle_pending_demand_requested);
       
                    //Mise a jour en bdd
                    Account.findByIdAndUpdate(id_pending.account_requested, { friends: nouvelle_liste_amis, pending_demands: nouvelle_pending_demand_requested}, function (err) {
                    if (err) { return next(err); }
                    
                        //Un fois l'update effectue on recupere la liste d'ami du compte mise a jour pour l'envoyer a la sortie de la waterfall
                        Account.findOne({_id: id_pending.account_requested}, 'friends' )
                        .populate({path: 'friends', options: { sort: { 'username': 1 } } })     //remplace les id par toutes les infos et on tri par nom d'utilisateur
                        .exec(function (err, account_requested_liste_amis) {
                            if (err) { return next(err); }
                            //ICI envoi de la valeur de retour de la callback
                            callback(null, account_requested_liste_amis);
                        });
                    });
                });
                
                //On fait de meme pour le compte qui envoi la demande
                Account.findOne({_id: id_pending.account_requesting})
                .exec(function (err, account_requesting) {
                    if (err) { return next(err); }
                
                    //On met a jour sa liste d'amis
                    var nouvelle_liste_amis = account_requesting.friends;
                    nouvelle_liste_amis.push(id_pending.account_requested);
                    
                    //On met a jour sa pending demand
                    var nouvelle_pending_demand_requesting = account_requesting.pending_demands;
                    nouvelle_pending_demand_requesting.forEach(function(item, index, tableau){
                        if (item == req.body.id_pending_demand) {
                        tableau.splice(index, 1);
                        }
                    });
       
                    //Mise a jour en bdd
                    Account.findByIdAndUpdate(id_pending.account_requesting, { friends: nouvelle_liste_amis, pending_demands: nouvelle_pending_demand_requesting}, function (err) {
                    if (err) { return next(err); }
                    });
                });
                
                //On met a jour la friend request
                Friend_request.findByIdAndUpdate(req.body.id_pending_demand, { status: 'accepted' }, function (err) {
                if (err) { return next(err); }
                });
            }
        ], 
        //Une fois les traitements termines, on affiche la reponse
        function (err, result) {
            if (err) { return next(err); }
            //Ce qu'on doit faire apres que la BDD ait ete mise a jour - envoi des amis a jour pour les re-afficher
            console.log("Je recupere la liste d\'amis mise a jour: ", result);
            res.json({ liste_amis_a_jour: result});
        });
};


//Methode POST refuser ami
exports.refuser_amiPOST = function(req, res) {
    
    console.log('refus');
    console.log('donnes: ', req.body.id_pending_demand);
    
    
    //Une waterfall car on est dependant de la reponse d'une requete avant de passer aux suivante
    async.waterfall([
            
            //On recupere les infos de la pending demand (On en a besoin pour la suite)
            function(callback) {
                Friend_request.findOne({_id: req.body.id_pending_demand})
                .exec(function (err, id_pending) {
                    if (err) { return next(err); }
                    callback(null, id_pending);
                });
            },
            //On les transmet pour mettre a jour nos comptes
            function(id_pending, callback) {
                
                //On lance la mise a jour du compte qui recoit la demande
                Account.findOne({_id: id_pending.account_requested})
                .populate({path: 'friends', options: { sort: { 'username': 1 } } })     //remplace les id par toutes les infos et on tri par nom d'utilisateur
                .exec(function (err, account_requested) {
                    if (err) { return next(err); }
                    
                    //On met a jour sa liste d'amis - (on verifie que cet ami n'est bel et bien pas present. Si c'est le cas, on le supprime)
                    var nouvelle_liste_amis = account_requested.friends;
                    var test_presence_ami = nouvelle_liste_amis.indexOf(id_pending.account_requesting);
                    if(test_presence_ami !== -1){
                        nouvelle_liste_amis.splice(test_presence_ami, 1);
                    }
                
                    //On met a jour sa pending demand
                    var nouvelle_pending_demand_requested = account_requested.pending_demands;
                    nouvelle_pending_demand_requested.forEach(function(item, index, tableau){
                        
                        console.log('item: ', item);
                        console.log('id_pending: ', req.body.id_pending_demand);
                        console.log('typeof item: ', typeof item);    //typeof est string
                        console.log('typeof id_pending: ', typeof req.body.id_pending_demand);    //typeof est object
                        
                        console.log('tableau avant splice: ', nouvelle_pending_demand_requested);
                        if (item == req.body.id_pending_demand) {
                            console.log('on vire du tableau');
                            tableau.splice(index, 1);
                        }
                        console.log('tableau apres splice: ', nouvelle_pending_demand_requested);
                    });
                    
                    console.log('nouvelle_pending_demand_requested: ', nouvelle_pending_demand_requested);
       
                    //Mise a jour en bdd
                    Account.findByIdAndUpdate(id_pending.account_requested, { friends: nouvelle_liste_amis, pending_demands: nouvelle_pending_demand_requested}, function (err) {
                    if (err) { return next(err); }
                    });
                    
                    //On envoie a la fonction finale la liste d'amis qui n'a pas bougee qu'il faudra afficher au retour de la reponse xhr
                    callback(null, account_requested.friends);
                });
                
                //On fait de meme pour le compte qui envoi la demande
                Account.findOne({_id: id_pending.account_requesting})
                .exec(function (err, account_requesting) {
                    if (err) { return next(err); }
                
                    //On met a jour sa liste d'amis - (on verifie que cet ami n'est bel et bien pas present. Si c'est le cas, on le supprime)
                    var nouvelle_liste_amis = account_requesting.friends;
                    var test_presence_ami = nouvelle_liste_amis.indexOf(id_pending.account_requested);
                    if(test_presence_ami !== -1){
                        nouvelle_liste_amis.splice(test_presence_ami, 1);
                    }
                    
                    //On met a jour sa pending demand
                    var nouvelle_pending_demand_requesting = account_requesting.pending_demands;
                    nouvelle_pending_demand_requesting.forEach(function(item, index, tableau){
                        if (item == req.body.id_pending_demand) {
                        tableau.splice(index, 1);
                        }
                    });
       
                    //Mise a jour en bdd
                    Account.findByIdAndUpdate(id_pending.account_requesting, { friends: nouvelle_liste_amis, pending_demands: nouvelle_pending_demand_requesting}, function (err) {
                    if (err) { return next(err); }
                    });
                });
                
                //On met a jour la friend request
                Friend_request.findByIdAndUpdate(req.body.id_pending_demand, { status: 'refused' }, function (err) {
                if (err) { return next(err); }
                });
            }
        ], 
        //Une fois les traitements termines, on affiche la reponse
        function (err, result) {
            if (err) { return next(err); }
            //Ce qu'on doit faire apres que la BDD ait ete mise a jour - envoi des amis a jour pour les re-afficher
            console.log("Je recupere la liste d\'amis a jour: ", result);
            res.json({ liste_amis_a_jour: result});
        });   
};








//Fonctions necessaires
function premiere_lettre_MAJ(chaine){
    return (chaine+'').charAt(0).toUpperCase()+chaine.substr(1);
}