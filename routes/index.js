var express = require('express');
var router = express.Router();



//Gestion des ROUTES

//On rajoute nos controleurs
var controller = require('../controllers/controller');


router.get('/', controller.index);

//Route permettant de presenter l'ecran de login
router.get('/login', controller.loginGET);

//Route permettant de loguer l'utilisateur
router.post('/login', controller.loginPOST);

//Route permettant de creer une nouvel utilisateur
router.post('/register', controller.registerPOST);

//Route permettant de dekoguer l'utilisateur
router.get('/logout', controller.logout);

//Route permettant de rechercher des amis
router.get('/recherche', controller.rechercheGET);

//Route permettant l'ajout d'un ami
router.post('/ajout_ami/', controller.ajout_amiPOST);

//Route permettant de recuperer les demandes d'ami pending
router.get('/get_pendings/', controller.get_pendingGET);

//Route permettant de gerer l'acceptation d'un ami
router.post('/accepter_ami/', controller.accepter_amiPOST);

//Route permettant de refuser une demande d'amitiee
router.post('/refuser_ami/', controller.refuser_amiPOST);

module.exports = router;
