//Connexion a socket.io
var socket = io.connect('https://chat-nico.herokuapp.com/');     //Si on bosse en local

//Liste des amis de l'utilisateur
var liste_amis = [];
//On recupere tous les elements amis
var div_affichage_amis = document.getElementById('div_affichage_amis_deconnectes');         //Tous les elements au sein du DIV d'affichage d'amis
var liste_ami_affiche =  div_affichage_amis.childNodes;                         //Tous les enfants au sein de ce DIV sous forme de tableau
for(let i = 0; i < liste_ami_affiche.length; i++){
    var p_ami_affiche = liste_ami_affiche[i].firstElementChild;
    //console.log('id: ', p_ami_affiche.id);
    liste_amis.push(p_ami_affiche.id);
}
var liste_utilisateur_connectes = [];

//Variable globale pour savoir sur quelle room on est connecte - Par defaut, chat general
var choix_room = '';

//Au chargement de la page - On envoie a SOCKET qui vient de se connecter
//Recuperation du nom de l'utilisateur qui vient de se connecter pour l'envoyer a socket.io
//Le nom d'utilisateur est present dans le div de bienvenue
var div_titre = document.getElementById('div_titre');
var nom_utilisateur = div_titre.textContent;
//Grace a une regex on isole le nom de l'utilisateur (on vire le 'Bienvenue ')
const regex = /Bienvenue /gi;
nom_utilisateur = nom_utilisateur.replace(regex, '');
//on l'envoie a socket.io
socket.emit('utilisateur_connecte', nom_utilisateur);

//Une variable globale pour stocker le nom de l'ami a qui on parle
var nom_ami = '';

//Une variable globale qui nous indique combien de messages historiques ont ete charges
var nombre_total_messages_historiques_charges = 0;

//cette variable permettra de mesurer le temps ecoule entre chaque moment ou l'utilisateur tapera sur le clavier pour afficher le message de frappe en cours
var tempo_typing = Date.now();

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SOCKET ////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////


//A la connexion d'un utilisateur - Si celui-ci fait parti de nos amis on l'affiche connecte
socket.on('liste_utilisateurs_connectes', function(message) {
   
    console.log('Liste des utilisateurs connectes: ' + message.liste);
    console.log('liste des amis: ', liste_amis);
    //Je met dans un tableau a porte globale la liste des utilisateurs connectes au cas ou j'en ai besoin si il y a des pending request a traiter (dans l'autre fichier js)
    liste_utilisateur_connectes = message.liste;
    console.log('liste_utilisateur_connectes: ', liste_utilisateur_connectes);
    
    var div_affichage_amis_connectes = document.getElementById('div_affichage_amis_connectes');
    
    for (let i = 0; i < liste_amis.length; i++){
        
        if(message.liste.indexOf(liste_amis[i]) != -1){
            
            //On utilise une closure pour pouvoir definir nos evenements sur chaque ami. Closure necessaire pour utiliser la variable i a l'interieur de l'evenement
            (function() {
                
                var currentI = i;
            
                console.log('On traite: ', liste_amis[currentI]);
                var ami_a_modifier = document.getElementById(liste_amis[currentI]);

                //On bouge l'element dans le div des amis connectes - On remonte sur l'element parent avant pour prendre le DIV contenant et pas juste de P
                var old_ami_a_modifier = ami_a_modifier.parentNode;
                old_ami_a_modifier = old_ami_a_modifier.parentNode.removeChild(old_ami_a_modifier);
                //On le place dans le div des amis connectes
                div_affichage_amis_connectes.appendChild(old_ami_a_modifier);

                //On applique le style pour montrer que l'ami est connecte - On descend avant sur l'enfant pour appliquer le style non sur le DIV contenant mais sur le P
                old_ami_a_modifier.firstElementChild.className = 'p_ami_affiche_connecte';
            
                //On applique notre evenement de click dessus
                old_ami_a_modifier.firstElementChild.addEventListener("click", function() {
                    console.log('j\'ai cliqueee sur: ' + liste_amis[currentI]);
                    socket.emit('ioClient_choix_user', liste_amis[currentI]);
                });
            })();
        }
    }
});


//Lorsqu'un utilisateur se connecte
socket.on('nouvel_utilisateur_connecte', function(message) {
    
    console.log('ami qui vient de se connecter: ', message.utilisateur);
    
    //Si on demande une mise a jour de la liste suite a l'accpetation d'une amitiee
    if(message.maj === true){
        
        console.log('Je suis sur une mise a jour TRUE');
        
        //On efface les resultats de recherche
        var div_affichage_amis = document.getElementById('div_affichage_recherche_amis');
        suppression_anciens_elements(div_affichage_amis);
        
        //On rajoute le nom dans notre liste d'amis
        liste_amis.push(message.utilisateur);
        
        //Il faut ensuite rajouter l'utilisateur dans la liste des utilisateurs non connectes avant de poursuivre le traitement
        var div_affichage_amis_deconnectes = document.getElementById('div_affichage_amis_deconnectes');
   
        creation_div_avec_valeur('div_ami_affiche', div_affichage_amis_deconnectes, message.utilisateur);
        
    }
    
    
    //On recupere la liste des amis connectes
    var div_affichage_amis_connectes = document.getElementById('div_affichage_amis_connectes');
    var liste_ami_affiche_connectes =  div_affichage_amis_connectes.childNodes;
    console.log('liste_ami_affiche_connectes.length: ' + liste_ami_affiche_connectes.length);
    //On met dans un tableau l'id de chaque element ce qui nous permet en meme temps de connaitre leur emplacement (index du tableau)
    var position_ami_connectes = [];
    for(let i = 0; i < liste_ami_affiche_connectes.length; i++){
        console.log("liste_ami_affiche_connectes[i] " + liste_ami_affiche_connectes[i].firstElementChild.id);
        position_ami_connectes.push(liste_ami_affiche_connectes[i].firstElementChild.id);
    }

    //On ajoute notre nouvel utilisateur au tableau pour pouvoir faire le traitement alphabetique
    position_ami_connectes.push(message.utilisateur);
    
    console.log('position_ami_connectes: ' + position_ami_connectes);
    
    //On tri notre liste par ordre alphabetique
    position_ami_connectes.sort();
    
    //On recupere l'index de notre nouvel utilisateur apres tri
    var index_ami_position = position_ami_connectes.indexOf(message.utilisateur);
    
    //On l'affiche connecte dans la liste d'amis
    var index_ami_a_modifier = liste_amis.indexOf(message.utilisateur);
    if(index_ami_a_modifier != -1){
        var ami_a_modifier = document.getElementById(liste_amis[index_ami_a_modifier]);
        
        //On retire l'element de la liste des amis deconnectes - On remonte sur l'element parent avant pour prendre le DIV contenant et pas juste de P
        var old_ami_a_modifier = ami_a_modifier.parentNode;
        old_ami_a_modifier = old_ami_a_modifier.parentNode.removeChild(old_ami_a_modifier);
        
        //On se place au bon endroit dans l'arbre du DOM
        
        //On recupere le premier element dans le div_affichage_amis_connectes
        var premier_element = div_affichage_amis_connectes.firstElementChild;
        
        //Si notre nouvel element est en tete de liste, on l'insere avant le premier element actuel
        if(index_ami_position === 0){
            div_affichage_amis_connectes.insertBefore(old_ami_a_modifier, premier_element);
        }
        //Sinon on doit se positioner sur l'element qui viendra apres nous
        else{
            for(let i = 0; i < index_ami_position; i++){
                premier_element = premier_element.nextSibling;
            }
            //Une fois positione, on insere avant cet element
            div_affichage_amis_connectes.insertBefore(old_ami_a_modifier, premier_element);
        }
        
        //On applique le style et l'evenement - On descend avant sur l'enfant pour appliquer le style non sur le DIV contenant mais sur le P
        console.log(old_ami_a_modifier.firstElementChild);
        old_ami_a_modifier.firstElementChild.className = 'p_ami_affiche_connecte';
        console.log(old_ami_a_modifier.firstElementChild);
        
        //evenement pour rendre l'ami cliquable et ouvrir la room privee
        old_ami_a_modifier.firstElementChild.addEventListener("click", function() {
            console.log('j\'ai clique sur: ' + old_ami_a_modifier.firstElementChild.id);
            socket.emit('ioClient_choix_user', old_ami_a_modifier.firstElementChild.id);
        });
    }
});


//On selectione sur quelle room on va parler
socket.on('choix_room', function(message) {
    
    console.log('le choix de la room est: ', message.choix_room);
    //On garde en memoire sur le client le nom de la room
    choix_room = message.choix_room;
    //alert('le choix de la room est: ' + message.choix_room);
    
    //J'initialise ma variable au cas ou j'ai clique sur mon propre nom
    nombre_total_messages_historiques_charges = 0;
    
    console.log('Nombre de messages a afficher: ' + message.liste_messages.length);
    
    //On met a jour notre variable ami pour savoir avec qui on parle
    nom_ami = message.ami;
    
    //On met a jour notre variable de messages historiques pour savoir combien on en a charge
    nombre_messages_historiques_charges = message.liste_messages.length;
    
    //On modifie le nom de la room
    var p_room = document.getElementById('p_room');
    p_room.textContent = 'Vous dialoguez avec ' + message.ami;
    
    //On vide la page de chat
    var div_a_effacer = document.getElementById('fenetre_chat_messages');
    suppression_anciens_elements(div_a_effacer);
    
    //On affiche l'historique des conversations a l'envers pour afficher le plus recent en bas
    var fenetre_chat_messages = document.getElementById('fenetre_chat_messages');
    for(let i = message.liste_messages.length - 1; i >= 0; i--){
        
        if( message.liste_messages[i].author[0].username == nom_utilisateur){
            creation_div_avec_utilisateur_et_messages('div_nouveau_message_destinataire', fenetre_chat_messages, message.liste_messages[i].text, message.liste_messages[i].author[0].username, 'div_mise_en_forme_destinatire');
        }
        else{
            creation_div_avec_utilisateur_et_messages('div_nouveau_message_emetteur', fenetre_chat_messages, message.liste_messages[i].text, message.liste_messages[i].author[0].username, 'div_mise_en_forme_emetteur');
        }
    }
    
    //Scroll des message arrive en haut - Il faut charger plus de messages - Cet evenement doit etre desactive lorsque l'on change de room
    var fenetre_chat_messages = document.getElementById('fenetre_chat_messages');
    fenetre_chat_messages.addEventListener("scroll", evenement_scroll );
});





//Si on a demande a charger plus de messages historique en scrollant jusqu'en haut du div d'affichage des messages
socket.on('nouveaux_messages_historique_a_afficher', function(message) {
    
    var fenetre_chat_messages = document.getElementById('fenetre_chat_messages');
    
    //On met a jour notre variable
    nombre_total_messages_historiques_charges = message.nombre_total_messages_historiques_charges;
    
    console.log('nombre_total_messages_historiques_charges: ' + nombre_total_messages_historiques_charges);
    
    //On rajoute les messages au dessus des messages deja affiches
    for(let i = 0; i < message.liste_messages.length; i++){
        
        if( message.liste_messages[i].author[0].username == nom_utilisateur){
            creation_div_avec_utilisateur_et_messages('div_nouveau_message_destinataire', fenetre_chat_messages, message.liste_messages[i].text, message.liste_messages[i].author[0].username, 'div_mise_en_forme_destinatire', true);
        }
        else{
            creation_div_avec_utilisateur_et_messages('div_nouveau_message_emetteur', fenetre_chat_messages, message.liste_messages[i].text, message.liste_messages[i].author[0].username, 'div_mise_en_forme_emetteur', true);
        }
    }
    
    //on re-active l'evenement a la fin de la boucle avec un peu d'interval 
    setTimeout(function() {

        fenetre_chat_messages.addEventListener("scroll", evenement_scroll );
        fenetre_chat_messages.scrollTop = 10;

    }, 200);
    
    //Si on est arrive a la fin des messages a afficher
    if (message.test_fin === true){
        //On re-initialise notre variable de compte
        nombre_total_messages_historiques_charges = 0;
        
        //On desactive l'evenement sur le scroll avec le meme interval pour etre sur que l'evenement etait deja actif
        setTimeout(function() {
            fenetre_chat_messages.removeEventListener("scroll", evenement_scroll);
        }, 200);
        //On affiche un message indiquant que l'on est en fin d'Historique
        creation_div_avec_utilisateur_et_messages('div_fin_historique', fenetre_chat_messages, 'Fin de l\'historique', 'Message', 'div_mise_en_forme_fin_historique', true);
    }
});



//Quand le serveur indique que le correspondant tape au clavier
socket.on('action_client_typing', function(message) {
    
    //On l'indique au dessus du textarea
    var p_typing = document.getElementById('p_typing');
    p_typing.textContent = message.utilisateur_qui_tape + ' compose un message ';
    var div_typing = document.getElementById('div_typing');
    div_typing.style.display = 'flex';
});



socket.on('action_client_stop_typing', function(message) {
    
    var p_typing = document.getElementById('p_typing');
    p_typing.textContent = '';
    var div_typing = document.getElementById('div_typing');
    div_typing.style.display = 'none';
});






//Deconnexion d'un utilisateur - Mise a jour des utilisateurs connectes cote cient
socket.on('utilisateur_deconnecte', function(message) {

        console.log('ami qui vient de se DEconnecter: ', message.utilisateur_deconnecte);


        //On recupere la liste des amis deconnectes
        var div_affichage_amis_deconnectes = document.getElementById('div_affichage_amis_deconnectes');
        var liste_ami_affiche_deconnectes =  div_affichage_amis_deconnectes.childNodes;
  
        //On met dans un tableau l'id de chaque element ce qui nous permet en meme temps de connaitre leur emplacement (index du tableau)
        var position_ami_deconnectes = [];
        for(let i = 0; i < liste_ami_affiche_deconnectes.length; i++){
            console.log("liste_ami_affiche_deconnectes[i] " + liste_ami_affiche_deconnectes[i].firstElementChild.id);
            position_ami_deconnectes.push(liste_ami_affiche_deconnectes[i].firstElementChild.id);
        }

        //On ajoute notre nouvel utilisateur au tableau pour pouvoir faire le traitement alphabetique
        position_ami_deconnectes.push(message.utilisateur_deconnecte);

        console.log('position_ami_deconnectes: ' + position_ami_deconnectes);

        //On tri notre liste par ordre alphabetique
        position_ami_deconnectes.sort();

        //On recupere l'index de notre nouvel utilisateur apres tri
        var index_ami_position = position_ami_deconnectes.indexOf(message.utilisateur_deconnecte);



        //On l'affiche deconnecte dans la liste d'amis
        var index_ami_a_modifier = liste_amis.indexOf(message.utilisateur_deconnecte);
        if(index_ami_a_modifier != -1){
            var old_ami_a_modifier = document.getElementById(liste_amis[index_ami_a_modifier]);

            //On retire l'element de la liste des amis deconnectes - On remonte sur l'element parent avant pour prendre le DIV contenant et pas juste de P
            var old_ami_a_modifier = old_ami_a_modifier.parentNode;
            old_ami_a_modifier = old_ami_a_modifier.parentNode.removeChild(old_ami_a_modifier);

            //On se place au bon endroit dans l'arbre du DOM

            //On recupere le premier element dans le div_affichage_amis_connectes
            var premier_element = div_affichage_amis_deconnectes.firstElementChild;

            //Si notre nouvel element est en tete de liste, on l'insere avant le premier element actuel
            if(index_ami_position === 0){
                div_affichage_amis_deconnectes.insertBefore(old_ami_a_modifier, premier_element);
            }
            //Sinon on doit se positioner sur l'element qui viendra apres nous
            else{
                for(let i = 0; i < index_ami_position; i++){
                    premier_element = premier_element.nextSibling;
                }
                //Une fois positione, on insere avant cet element
                div_affichage_amis_deconnectes.insertBefore(old_ami_a_modifier, premier_element);
            }

            //On applique le style et l'evenement - On descend avant sur l'enfant pour appliquer le style non sur le DIV contenant mais sur le P
            console.log(old_ami_a_modifier.firstElementChild);
            old_ami_a_modifier.firstElementChild.className = 'p_ami_affiche_deconnecte';

/*
            //On supprime l'evenement cliquable
            var parentDiv = old_ami_a_modifier.parentNode;
            parentDiv.replaceChild(ami_a_modifier_remplacant, ami_a_modifier);
*/
        
        }
});










////////////////////////////////////////////////////////////////////////////////
////////////////////////////// EVENEMENTS //////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////



/////////////////////////// Envoie d'un message ////////////////////////////////



//Evenement permettant de gerer l'appui sur entree lors de la redaction de message (on envoie le formulaire sur un appui entree mais shift permet le retour a la ligne)
document.getElementById("textarea_message").onkeypress = function(event){
    if (event.keyCode == 13 && !event.shiftKey){
        
        //empeche d'envoyer le formulaire
        event.preventDefault ? event.preventDefault() : (event.returnValue = false);

        var message_a_envoyer = document.getElementById('textarea_message').value;

        console.log('message a envoyer: ', message_a_envoyer);

        socket.emit('envoi_message', {message: message_a_envoyer, utilisateur: nom_utilisateur, ami: nom_ami});

        //Creation du nouvel element
        var fenetre_chat_messages = document.getElementById('fenetre_chat_messages');
        creation_div_avec_utilisateur_et_messages('div_nouveau_message_destinataire', fenetre_chat_messages, message_a_envoyer, nom_utilisateur, 'div_mise_en_forme_destinataire');

        //re-initialisation du formulaire
        document.getElementById('textarea_message').value = '';
        document.getElementById('textarea_message').focus();
    }
};


var formulaire_redaction = document.getElementById('formulaire_redaction');
formulaire_redaction.addEventListener("submit", function(e) {
    
    //empeche d'envoyer le formulaire
    event.preventDefault ? event.preventDefault() : (event.returnValue = false);
    
    var message_a_envoyer = document.getElementById('textarea_message').value;
    
    console.log('message a envoyer: ', message_a_envoyer);
    
    socket.emit('envoi_message', {message: message_a_envoyer, utilisateur: nom_utilisateur, ami: nom_ami});
    
    //Creation du nouvel element
    var fenetre_chat_messages = document.getElementById('fenetre_chat_messages');
    creation_div_avec_utilisateur_et_messages('div_nouveau_message_destinataire', fenetre_chat_messages, message_a_envoyer, nom_utilisateur, 'div_mise_en_forme_destinataire');

    //re-initialisation du formulaire
    document.getElementById('textarea_message').value = '';
    document.getElementById('textarea_message').focus();
});



///////////////////////// Reception d'un message ///////////////////////////////

socket.on('reception_message', function(message) {

    console.log('message recu: ' + message);


    //On affiche le message a la suite de la discusssion
    var fenetre_chat_messages = document.getElementById('fenetre_chat_messages');
    
    //Creation du nouvel element
    creation_div_avec_utilisateur_et_messages('div_nouveau_message_emetteur', fenetre_chat_messages, message.message, message.utilisateur);


});




//Clic pour retourner au chat principal
var a_retour_chat_principal = document.getElementById('a_retour_chat_principal');
a_retour_chat_principal.addEventListener("click", function(e) {
    
    //empeche de suivre le lien
    event.preventDefault ? event.preventDefault() : (event.returnValue = false);
    
    //On eleve l'ecoute de l'evenement de scroll pour eviter de le provoquer lorsque le div va etre remis a 0
    var fenetre_chat_messages = document.getElementById('fenetre_chat_messages');
    fenetre_chat_messages.removeEventListener("scroll", evenement_scroll);
    
    //On vide la page de chat
    suppression_anciens_elements(fenetre_chat_messages);
    
    //On affiche le retour sur le chat principal
    var p_room = document.getElementById('p_room');
    p_room.textContent = 'Vous etes sur le chat principal';
    
    //On envoi le nom de la room sur laquelle on est pour s'en deconnecter
    socket.emit('deco_room', {room: choix_room});
    
    //Retour au chat principal cote client
    choix_room = '';
    nombre_total_messages_historiques_charges = 0;
});




//Annulation de l'ajout d'ami
var formulaire_annulation_ajout_ami = document.getElementById('formulaire_annulation_ajout_ami');
formulaire_annulation_ajout_ami.addEventListener("submit", function(e) {
    var div_overlay_confirmation_envoie_ajout_ami = document.getElementById('div_overlay_confirmation_envoie_ajout_ami');
    var div_genral = document.getElementById('div_genral');
    
    div_overlay_confirmation_envoie_ajout_ami.style.display = 'none';
    div_genral.style.display = 'flex';
    
    //empeche d'envoyer le formulaire
    event.preventDefault ? event.preventDefault() : (event.returnValue = false);
});



//////////////////////////// Recherche d'un ami ////////////////////////////////
var formulaire_recherche_amis = document.getElementById('formulaire_recherche_amis');
formulaire_recherche_amis.addEventListener("submit", function(e) {
    
    //On empeche l'envoi du formulaire
    event.preventDefault ? event.preventDefault() : (event.returnValue = false);
    
    //recuperation de la valeur de la recherche
    var input_recherche_amis = document.getElementById('input_recherche_amis');
        input_recherche_amis = input_recherche_amis.value;


    //On envoie une requete HTTP au serveur pour qu'il recherhe les amis
    var xhr_recherche_ami = new XMLHttpRequest();

    //On lui envoi la variable qui se trouve dans notre input
    xhr_recherche_ami.open("GET", "/recherche/?ami_recherche=" + input_recherche_amis);
    //Cette ligne permet d'empecher l'utilisation du cache du navigateur pour la requete xhr - Sans ca j'ai un bug qui m'empeche de deplacer des capitaines sur les cases ou il a ete recement positionne
    //xhr_recherche_ami.setRequestHeader("Cache-Control","no-cache");            
    //Oblige de faire tout ce merdier pour IE sinon la requete XHR n'est pas envoyee au serveur
    xhr_recherche_ami.setRequestHeader('cache-control', 'no-cache, must-revalidate, post-check=0, pre-check=0');
    xhr_recherche_ami.setRequestHeader('cache-control', 'max-age=0');
    xhr_recherche_ami.setRequestHeader('expires', '0');
    xhr_recherche_ami.setRequestHeader('expires', 'Tue, 01 Jan 1980 1:00:00 GMT');
    xhr_recherche_ami.setRequestHeader('pragma', 'no-cache');
    
    xhr_recherche_ami.send(null);

    console.log('j\envoie les donnes xhr RECHERCHE AMI');
    
    
    //Une fois que la requete est terminee - callback
    xhr_recherche_ami.addEventListener('readystatechange', function() {
        if (xhr_recherche_ami.readyState === XMLHttpRequest.DONE) { // La constante DONE appartient à l'objet XMLHttpRequest, elle n'est pas globale

            console.log('requete XHR terminee');    
            
            //On recupere notre reponse venant du serveur au format JSON
            var response = JSON.parse(xhr_recherche_ami.responseText);

            console.log('response: ', response.liste_amis_JSON);
            
            //Selection du div contenant les informations
            var div_affichage_recherche_amis = document.getElementById('div_affichage_recherche_amis');
            
            //Suppression des eventuels elements presents avant de mettre a jour
            suppression_anciens_elements(div_affichage_recherche_amis);
            
            //Affichage des resultat en inserant les donnees dans des DIV
            
            console.log('response.liste_amis_JSON: ', response.liste_amis_JSON);
            
            for (let j = 0; j < response.liste_amis_JSON.length; j++){
                
                //On utilise une closure pour pouvoir definir nos evenements sur les bouttons Accpeter, Refuser et Annuler autrement IE gere mal les evenements
                (function() {

                    var currentI = j;
                
                
                    console.log("response.liste_amis_JSON.length: ", response.liste_amis_JSON.length);
                    //console.log('liste_amis[currentI].username: ', response.liste_amis_JSON[currentI].username);
                    //console.log('liste_amis[currentI].id: ', response.liste_amis_JSON[currentI]._id);

                    console.log('on traite: ', response.liste_amis_JSON[currentI].username);

                    console.log('pending_demands: ', response.pending_demands);

                    //Si l'ami trouve n'a pas de pending request, on l'affiche avec son lien actif pour pouvoir etre clique
                    if(response.pending_demands.indexOf(response.liste_amis_JSON[currentI].username) === -1 ){
                        console.log('DIV pour PAS ENCORE ajoute: ' + response.liste_amis_JSON[currentI].username);
                        creation_div_avec_valeur('div_ami_trouve', div_affichage_recherche_amis, response.liste_amis_JSON[currentI].username, response.liste_amis_JSON[currentI]._id);


                        //On re-applique l'evenement sur le nouveau div
                        var nouveau_div_ami_trouve = document.getElementById(response.liste_amis_JSON[currentI].username);
                        var a_nouveau_div_ami_trouve = nouveau_div_ami_trouve.firstElementChild;

                        //console.log('nouveau_div_ami_trouve: ', nouveau_div_ami_trouve);
                        //console.log('a_nouveau_div_ami_trouve: ', a_nouveau_div_ami_trouve);
                        //console.log('l\'id de l\'ami ajoute est: ', a_nouveau_div_ami_trouve.title);
                        //console.log('le nom de l\'ami ajoute est: ', nouveau_div_ami_trouve.id);

                        a_nouveau_div_ami_trouve.addEventListener("click", function(e) {

                            console.log('on a clicke sur un HREF');

                            //On cache le div principal et on affiche l'overlay avec le message de confirmation
                            var div_overlay_confirmation_envoie_ajout_ami = document.getElementById('div_overlay_confirmation_envoie_ajout_ami');
                            var div_genral = document.getElementById('div_genral');

                            div_genral.style.display = 'none';
                            div_overlay_confirmation_envoie_ajout_ami.style.display = 'flex';

                            //On affiche le message de confirmation
                            var label_confirmation_ajout_ami = document.getElementById('label_confirmation_ajout_ami');
                            label_confirmation_ajout_ami.textContent = 'Voulez-vous envoyer une demande d\'ami a ' + response.liste_amis_JSON[currentI].username + '?';
                            label_confirmation_ajout_ami.className = 'message_information_ajout';


                            //On renseigne les valeurs a transmettre par le formulaire dans les input hidden
                            var input_hidden_username_ajout_ami = document.getElementById('input_hidden_username_ajout_ami');
                            var input_hidden_id_ajout_ami = document.getElementById('input_hidden_id_ajout_ami');

                            input_hidden_username_ajout_ami.name = response.liste_amis_JSON[currentI].username;
                            input_hidden_username_ajout_ami.value = response.liste_amis_JSON[currentI].username;
                            input_hidden_id_ajout_ami.name = response.liste_amis_JSON[currentI]._id;
                            input_hidden_id_ajout_ami.value = response.liste_amis_JSON[currentI]._id;


                            console.log('input_hidden_username_ajout_ami.value: ', input_hidden_username_ajout_ami.value);
                            console.log('input_hidden_id_ajout_ami.value: ', input_hidden_id_ajout_ami.value);

                            //On empeche le comportement du HREF (pas de lien vers une autre adresse)
                            event.preventDefault ? event.preventDefault() : (event.returnValue = false);

                        });
                    }
                    //Sinon on l'affiche mais sans etre cliquable
                    else{
                        console.log('DIV pour deja ajoute: ', response.liste_amis_JSON[currentI].username);
                        creation_div_avec_valeur('div_ami_trouve', div_affichage_recherche_amis, response.liste_amis_JSON[currentI].username, response.liste_amis_JSON[currentI]._id, true);
                    }
                })();//fin closure    
            }
        }
    });
});               
                
                
                
///////////Demande d'amitie lors du clic sur un nom d'utilisateur///////////////

var formulaire_validation_ajout_ami = document.getElementById('submit_ajout_ami');
formulaire_validation_ajout_ami.addEventListener("click", function(e) {

    //On empeche l'envoi du formulaire
    event.preventDefault ? event.preventDefault() : (event.returnValue = false);

   // console.log('l\'id de l\'ami ajoute est: ', response.liste_amis_JSON[i]._id);
   // console.log('le nom de l\'ami ajoute est: ', response.liste_amis_JSON[i].username);

    var input_hidden_username_ajout_ami = document.getElementById('input_hidden_username_ajout_ami');
    var input_hidden_id_ajout_ami = document.getElementById('input_hidden_id_ajout_ami');

    var div_overlay_confirmation_envoie_ajout_ami = document.getElementById('div_overlay_confirmation_envoie_ajout_ami');
    var div_overlay_ajax_loader = document.getElementById('div_overlay_ajax_loader');
    
    div_overlay_ajax_loader.style.display = 'flex';
    div_overlay_confirmation_envoie_ajout_ami.style.display = 'none';

    //Nouvel requete XHR
    var xhr_ajout_ami = new XMLHttpRequest();
    
    xhr_ajout_ami.open('POST', '/ajout_ami/');
    xhr_ajout_ami.setRequestHeader("Content-Type", "application/x-www-form-urlencoded", "Cache-Control","no-cache")
    xhr_ajout_ami.send("ami_ajoute=" + input_hidden_id_ajout_ami.value + "&ami_ajoute_username=" + input_hidden_username_ajout_ami.value);


    /*
    //On passe comme variable par la methode GET l'ID du l'utilisateur que l'on veut ajouter en ami et le nom d'utilisateur qui nous permettre plus tard de savoir quel div on doit supprimer des resultats
    xhr_ajout_ami.open("GET", "/ajout_ami/?ami_ajoute=" + input_hidden_id_ajout_ami.value + "&ami_ajoute_username=" +  input_hidden_username_ajout_ami.value );
    //Cette ligne permet d'empecher l'utilisation du cache du navigateur pour la requete xhr - Sans ca j'ai un bug qui m'empeche de deplacer des capitaines sur les cases ou il a ete recement positionne
    xhr_ajout_ami.setRequestHeader("Cache-Control","no-cache");            
    xhr_ajout_ami.send(null);
     * 
     * */
 

    console.log('j\envoie les donnes xhr AMI');

    //Une fois que la requete est terminee - callback - On veut afficher notre liste d'amis a jour
    xhr_ajout_ami.addEventListener('readystatechange', function() {
        if (xhr_ajout_ami.readyState === XMLHttpRequest.DONE) { // La constante DONE appartient à l'objet XMLHttpRequest, elle n'est pas globale

            console.log('requete XHR AMI terminee');

            //On recupere notre reponse venant du serveur au format JSON
            var response = JSON.parse(xhr_ajout_ami.responseText);

            console.log('response ajout ami: ', response.liste_amis_utilisateur_JSON.friends);


            //On recupere la liste des utilisateurs a jour
            socket.emit('recuperer_liste_utilisateurs_connectes');
            socket.on('liste_utilisateurs_connectes_a_jour', function(message) {
                liste_utilisateur_connectes = message.liste;
                
                //l'ancien element
                var div_ami_a_supprimer = document.getElementById(response.ami_ajoute);
                
                //Si il n'y avait pas de demande d'ami deja envoyees, on indique que la demande d'ami a ete faite pour cet utilisateur et on enleve l'evenement cliquqble dessus
                if(response.test_ajout == 'true'){

                    //Comme j'ai des problemes pour supprimer l'evenement de click dessus, je cree un nouvel element avec lequel je remplace l'ancien

                    //Creation des nouveaux elements
                    var div_contenant_valeur_ami_modifie = document.createElement('div');
                    div_contenant_valeur_ami_modifie.class = 'div_ami_trouve';
                    var p_valeur = document.createElement('p');
                    p_valeur.className = 'p_demande_ami_en_cours';
                    p_valeur.textContent = div_ami_a_supprimer.textContent + " - Demande d\'amitie envoyee";
                    //Append du texte dans le div
                    div_contenant_valeur_ami_modifie.appendChild(p_valeur);

                    //Remplacement sur l'objet parent - par un element non cliquable
                    var parentNode =  document.getElementById('div_affichage_recherche_amis');
                    parentNode.replaceChild(div_contenant_valeur_ami_modifie, div_ami_a_supprimer);
                }
                //Si La demande d'ami a deja ete faite par l'ami en question
                else{
                    //On va supprimer l'ami des resulats de recherche et l'afficher dans nos amis. Si l'ami est connecte, il doit apparaitre comme tel

                    //Suppression de l'element de l'affichage des resultats
                    div_ami_a_supprimer.parentNode.removeChild(div_ami_a_supprimer);


                    //Vidage de la liste des amis connectes
                    var div_affichage_amis_connectes = document.getElementById('div_affichage_amis_connectes');
                    suppression_anciens_elements(div_affichage_amis_connectes);
                    //Vidage de la liste des amis deconnectes
                    var div_affichage_amis_deconnectes = document.getElementById('div_affichage_amis_deconnectes');
                    suppression_anciens_elements(div_affichage_amis_deconnectes);
                    

                    //Affichage des amis des amis connectes en inserant les donnees dans des DIV
                    for (let i = 0; i < response.liste_amis_utilisateur_JSON.friends.length; i++){

                        (function() {

                            var currentI = i;

                            //Ajout des amis de l'utilisateur dans le div_affichage_amis_deconnectes
                            var div_affichage_amis_deconnectes = document.getElementById('div_affichage_amis_deconnectes');
                            creation_div_avec_valeur('div_ami_affiche', div_affichage_amis_deconnectes, response.liste_amis_utilisateur_JSON.friends[currentI].username);


                            //Pour les utilisateurs connectes il faut les deplacer dans le div_affichage_amis_connectes et leur appliquer le style
                            var ami_a_modifier = document.getElementById(response.liste_amis_utilisateur_JSON.friends[currentI].username);
                            console.log("ami_a_modifier id: ", response.liste_amis_utilisateur_JSON.friends[currentI].username);

                            var index_ami_a_modifier = liste_utilisateur_connectes.indexOf(response.liste_amis_utilisateur_JSON.friends[currentI].username);
                            //Si l'element doit etre deplace
                            if(index_ami_a_modifier != -1){

                                //Selection de l'element parent (le DIV contenant) et suppression de l'element du DOM
                                ami_a_modifier = ami_a_modifier.parentNode;
                                ami_a_modifier = ami_a_modifier.parentNode.removeChild(ami_a_modifier);

                                var div_affichage_amis_connectes = document.getElementById('div_affichage_amis_connectes');
                                var liste_utilisateurs_deja_appendes =  div_affichage_amis_connectes.childNodes;  
                                //on cree un tableau avec les noms d'utilisateur deja appendes pour faire le tri alphabetique
                                var tab_utilisateurs_deja_appendes = [];
                                for (let j = 0; j < liste_utilisateurs_deja_appendes.length; j++){
                                    liste_utilisateurs_deja_appendes[j] = liste_utilisateurs_deja_appendes[j].firstElementChild;
                                    tab_utilisateurs_deja_appendes.push(liste_utilisateurs_deja_appendes[j].textContent);
                                }
                                //J'ajoute mon nouvel utilisateur a la liste
                                tab_utilisateurs_deja_appendes.push(response.liste_amis_utilisateur_JSON.friends[currentI].username);
                                tab_utilisateurs_deja_appendes.sort();

                                //On recupere l'index de notre nouvel utilisateur apres tri
                                var index_ami_position = tab_utilisateurs_deja_appendes.indexOf(response.liste_amis_utilisateur_JSON.friends[currentI].username);

                                //On l'affiche connecte dans la liste d'amis
                                //On se place au bon endroit dans l'arbre du DOM

                                //On recupere le premier element dans le div_affichage_amis_connectes
                                var premier_element = div_affichage_amis_connectes.firstElementChild;

                                //Si notre nouvel element est en tete de liste, on l'insere avant le premier element actuel
                                if(index_ami_position === 0){
                                    div_affichage_amis_connectes.insertBefore(ami_a_modifier, premier_element);
                                }
                                //Sinon on doit se positioner sur l'element qui viendra apres nous
                                else{
                                    for(let k = 0; k < index_ami_position; k++){
                                        premier_element = premier_element.nextSibling;
                                    }
                                    //Une fois positione, on insere avant cet element
                                    div_affichage_amis_connectes.insertBefore(ami_a_modifier, premier_element);
                                }

                                //On applique le style et l'evenement - On descend avant sur l'enfant pour appliquer le style non sur le DIV contenant mais sur le P
                                console.log(ami_a_modifier.firstElementChild);
                                ami_a_modifier.firstElementChild.className = 'p_ami_affiche_connecte';

                                //evenement pour rendre l'ami cliquable et ouvrir la room privee
                                ami_a_modifier.firstElementChild.addEventListener("click", function() {
                                    console.log('j\'ai clique sur: ' + ami_a_modifier.firstElementChild.id);
                                    socket.emit('ioClient_choix_user', ami_a_modifier.firstElementChild.id);
                                });
                            }
                        })();
                    }
                    //Envoi d'un message au serveur pour lui demander de mettre a jour la liste d'ami si l'ami qui vient d'etre ajoute est connecte
                    console.log('socket.emit nom_utilisateur: ' + nom_utilisateur);
                    socket.emit('maj_liste_ami_ami_ajoute', {utilisateur: nom_utilisateur});
                }
            });
              
            var div_genral = document.getElementById('div_genral');
            //On re-affiche la page principale
            div_overlay_ajax_loader.style.display = 'none';
            div_genral.style.display = 'flex';
        }
    });
    console.log('on sort de la requet xhr');
});
                    
   

//Lorsque quqlqu'un tape au clavier - On veut que cela soit indique pour le correspondant
var textarea_message = document.getElementById('textarea_message');
textarea_message.addEventListener("keydown", function(e) {
    
    //Si la touche est differente de entree
    if(e.keyCode != 13){
        //On recupere le timestamp du moment ou la touche a ete frappee
        tempo_typing = Date.now();
        socket.emit('client_typing', {room: choix_room, utilisateur_qui_tape: nom_utilisateur});
    }
});
//arrete de taper au clavier, au n=bout de 5 sec d'inactivite...
textarea_message.addEventListener("keyup", stop_typing);
function stop_typing(e) {
    
    //Si la touche est 'entree' on vien td'envoyer le message donc il faut tout de suite couper l'affichage de l'utilisateur en train d'ecrire
    if(e.keyCode == 13){
        socket.emit('client_stopped_typing', {room: choix_room, utilisateur_qui_tape_plus: nom_utilisateur});
    }
    //Sinon on met une tempo de 5 sec pour dire que l'utilisateur ne tape plus
    else{
        setTimeout(function() {
            //Lors de la tentative d'execution de la fonction, si une touche a ete frappee avant 5000ms, on n'active pas l'evenement
            if(Date.now() > tempo_typing + 5000){
               socket.emit('client_stopped_typing', {room: choix_room, utilisateur_qui_tape_plus: nom_utilisateur});
            }
        }, 5000);
    }
}










////////////////////////////////////////////////////////////////////////////////
/////////////////////////////// FONCTIONS //////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

//Fonction permettant de creer et inserer les elements de reponse
function creation_div_avec_valeur (nom_classe_div, id_div_to_append, valeur, facultatif_href_id, facultatif_non_cliquable){
                
    //Creation des elements
    var div_contenant_valeur = document.createElement('div');
        div_contenant_valeur.className = nom_classe_div;
        
        
    //Dans le cas ou on affiche des messages simple. une balise P suffit (argument facultatif absent)
    if(!facultatif_href_id){
        var p_valeur = document.createElement('p');
        p_valeur.textContent = valeur;
        p_valeur.className = 'p_ami_affiche';
        p_valeur.id = valeur;
        //Append du texte dans le div
        div_contenant_valeur.appendChild(p_valeur);
    }
    else{
        if (facultatif_non_cliquable === true){
            var p_valeur = document.createElement('p');
            p_valeur.textContent = valeur + " - Demande d\'amitie envoyee";
            p_valeur.className = 'p_demande_ami_en_cours';
            p_valeur.id = '';   //On retire l'ID au cas ou la demande d'amitiee soit acceptee dans la foulee. (dans ce ca l'ami connecte sera affiche avec cet ID - on ne veut donc pas de doublon d'ID)
            div_contenant_valeur.appendChild(p_valeur);
        }
        else{
            //Dans le cas ou on affiche la liste d'amis, il faut que je puisse renvoyer des donnes au serveur pour faire l'ajout. J'utilise pour cela un lien
            var a_valeur = document.createElement('a');
            a_valeur.textContent = valeur;
            a_valeur.className = "a_ami_trouve";
            a_valeur.title = facultatif_href_id;        //C'est ici dont on a beasoin de notre variable facultative
            a_valeur.href = "";

            div_contenant_valeur.appendChild(a_valeur);
            //Dans le cas ou on utilise la fonction pour creer les div de resultat de recherche, on ajoute un id a chaque div pour pouvoir les indentifier plus tard afin de les supprimer lorsque l'on clique dessus et qu'un nouvel ami est ajoute
            div_contenant_valeur.id = valeur;
        }
    }
    
    //Append du div dans le div contenant
    id_div_to_append.appendChild(div_contenant_valeur);
}





function creation_div_avec_utilisateur_et_messages (nom_classe_div, id_div_to_append, valeur, utilisateur, id_div_mise_en_forme, facultatif_before){
                
    //DIV contenant
    var div_contenant_valeur = document.createElement('div');
        div_contenant_valeur.className = nom_classe_div;
        div_contenant_valeur.style.height = 'max-content';

    //DIV mise en forme
    var div_mise_en_forme = document.createElement('div');
        div_mise_en_forme.className = id_div_mise_en_forme;
        div_mise_en_forme.style.height = 'max-content';

    //P nom d'utilisateur
    var p_utilisateur = document.createElement('p');
        p_utilisateur.className = 'p_nom_utilisateur';
        p_utilisateur.textContent = utilisateur + ':'; 

    //P message
    var p_valeur = document.createElement('p');
        p_valeur.className = 'p_message';
        p_valeur.innerHTML = valeur;
        

    //Append du texte dans le div
    div_mise_en_forme.appendChild(p_utilisateur);
    div_mise_en_forme.appendChild(p_valeur);
    
    //Append du div dans le div contenant
    div_contenant_valeur.appendChild(div_mise_en_forme);
    
    //Mon argument facultatif_before me permet d'utiliser cette fonction pour ajouter des noeuds AVANT les autres
    if(facultatif_before === true){
        //Je dois recuperer le noeuds qui est le premier de la liste dans id_div_to_append
        var premier_noeud = id_div_to_append.firstElementChild;
        //On insere ensuite notre element AVANT le premier noeud
        id_div_to_append.insertBefore(div_contenant_valeur, premier_noeud);
        
        //On remet le scroll au 1/3 de sa position
        //id_div_to_append.scrollTop = 100;
        //id_div_to_append.scrollTop = id_div_to_append.scrollHeight/3;
    }
    //Pour un ajout apres les dernier noeud
    else{
        id_div_to_append.appendChild(div_contenant_valeur);
        
        //On met le scroll en bas
        id_div_to_append.scrollTop = id_div_to_append.scrollHeight;
    }
}




//Fonction permettant de vider tous les elements que pourrait contenir un element parent
function suppression_anciens_elements (div_a_vider){
    while (div_a_vider.firstChild) {
        div_a_vider.removeChild(div_a_vider.firstChild);
    }
}

//Fonction de l'evenement Scroll - Oblige de le mettre en fonction pour pouvoir le desactiver
function evenement_scroll () {
        var fenetre_chat_messages = document.getElementById('fenetre_chat_messages');
        
        if (fenetre_chat_messages.scrollTop === 0) {
            console.log('je dois recharger des docs');
            socket.emit('charger_plus_de_messages', {nombre_total_messages_historiques_charges: nombre_total_messages_historiques_charges});
            //On repositionne immediatement la barre de defilement hors evenement
            fenetre_chat_messages.scrollTop = 10;
            //On desactive l'eveneme nt pour le re-activer plus tard avec un peu de retard
            fenetre_chat_messages.removeEventListener("scroll", evenement_scroll);
        } 
    }