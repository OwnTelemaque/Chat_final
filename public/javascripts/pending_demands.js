
    
console.log('IL Y A DES PENDING DEMANDS!');

//Requete sur le serveur pour recuperer les demandes pending

var xhr_get_pendings = new XMLHttpRequest();

xhr_get_pendings.open("GET", "/get_pendings/");
xhr_get_pendings.setRequestHeader("Cache-Control","no-cache");            
xhr_get_pendings.send(null);

console.log('j\envoie les donnes xhr pending');


//Une fois que la requete est terminee - callback
xhr_get_pendings.addEventListener('readystatechange', function() {
    if (xhr_get_pendings.readyState === XMLHttpRequest.DONE) {
    
        console.log('requete XHR pending terminee');

        //On recupere notre reponse venant du serveur au format JSON

        var response = JSON.parse(xhr_get_pendings.responseText);

        if(response.liste_pendings.length > 0){
            //On cache le Chat
            var div_genral = document.getElementById('div_genral');
            div_genral.style.display = 'none';
        }
        
        console.log('response.liste_pendings: ', response.liste_pendings);
        
        
        
        //On cree une page par demande
        for(let k = 0; k < response.liste_pendings.length; k++){

            //On utilise une closure pour pouvoir definir nos evenements sur les bouttons Accpeter, Refuser et Annuler autrement IE gere mal les evenements
            (function() {

                var currentK = k;


                //On cree notre overlay et on lui attribue un z-index different des autres pour creer une pile de formulaires
                var div_overlay_pending_demands = document.createElement('div');
                div_overlay_pending_demands.id = 'div_overlay_pending_demands' + currentK;
                div_overlay_pending_demands.className = 'div_overlay_pending_demands';
                div_overlay_pending_demands.style.position = 'absolute';
                div_overlay_pending_demands.style.zIndex = currentK;
                if(currentK === 0){
                   div_overlay_pending_demands.style.display = 'flex';
                   console.log('flex');
                }
                else{
                    div_overlay_pending_demands.style.display = 'none';
                    console.log('none');
                }


                //On cree notre message d'information
                var p_message_pending = document.createElement('p');
                p_message_pending.textContent = 'Souhaitez-vous ajouter ' + response.liste_pendings[currentK].username_account_requesting + ' en tant que nouvel ami?';
                p_message_pending.className = 'message_information_ajout';
                div_overlay_pending_demands.appendChild(p_message_pending);
////////////////
                //On cree notre formulaire d'ACCEPTATION
                var formulaire_validation_pending = document.createElement('form');
                formulaire_validation_pending.id = 'formulaire_validation_pending' + currentK;
                formulaire_validation_pending.className = 'formulaire_pending';
                formulaire_validation_pending.method = 'POST';
                formulaire_validation_pending.action = '';
                //input hidden
                var input_hidden_pending_accept = document.createElement('input');
                input_hidden_pending_accept.id = 'input_hidden_pending_accept' + currentK;
                input_hidden_pending_accept.setAttribute("type", "hidden");
                input_hidden_pending_accept.setAttribute("value", response.liste_pendings[currentK].id_pending);
                //input submit
                var submit_ajout_ami = document.createElement('input');
                submit_ajout_ami.id = 'submit_ajout_ami' + currentK;
                submit_ajout_ami.className = 'submit_formulaires_validation';
                submit_ajout_ami.setAttribute("type", "submit");
                submit_ajout_ami.setAttribute("value", "Accepter");
                //appends
                formulaire_validation_pending.appendChild(input_hidden_pending_accept);
                formulaire_validation_pending.appendChild(submit_ajout_ami);
                div_overlay_pending_demands.appendChild(formulaire_validation_pending);
////////////////
                //On cree notre formulaire de REFUS
                var formulaire_refus_pending = document.createElement('form');
                formulaire_refus_pending.id = 'formulaire_refus_pending' + currentK;
                formulaire_refus_pending.className = 'formulaire_pending';
                formulaire_refus_pending.setAttribute("method", "POST");
                formulaire_refus_pending.setAttribute("action", "");
                //input hidden
                var input_hidden_pending_refuse = document.createElement('input');
                input_hidden_pending_refuse.id = 'input_hidden_pending_refuse' + currentK;
                input_hidden_pending_refuse.setAttribute("type", "hidden");
                input_hidden_pending_refuse.setAttribute("value", response.liste_pendings[currentK].id_pending);
                //input submit
                var submit_refuse_ami = document.createElement('input');
                submit_refuse_ami.id = 'submit_refuse_ami' + currentK;
                submit_refuse_ami.className = 'submit_formulaires_validation';
                submit_refuse_ami.setAttribute("type", "submit");
                submit_refuse_ami.setAttribute("value", "Refuser");
                //appends
                formulaire_refus_pending.appendChild(input_hidden_pending_refuse);
                formulaire_refus_pending.appendChild(submit_refuse_ami);
                div_overlay_pending_demands.appendChild(formulaire_refus_pending);
////////////////
                //On cree notre formulaire 'ANNULATION
                var formulaire_annulation_pending = document.createElement('form');
                formulaire_annulation_pending.id = 'formulaire_annulation_pending' + currentK;
                formulaire_annulation_pending.className = 'formulaire_pending';
                //input submit
                var submit_annule_ami = document.createElement('input');
                submit_annule_ami.id = 'submit_annule_ami' + currentK;
                submit_annule_ami.className = 'submit_formulaires_validation';
                submit_annule_ami.setAttribute("type", "submit");
                submit_annule_ami.setAttribute("value", "Annuler");
                //appends
                formulaire_annulation_pending.appendChild(submit_annule_ami);
                div_overlay_pending_demands.appendChild(formulaire_annulation_pending);


                console.log('id_pending: ', response.liste_pendings[currentK].id_pending);
                console.log('id_account_requesting: ', response.liste_pendings[currentK].id_account_requesting);
                console.log('username_account_requesting: ', response.liste_pendings[currentK].username_account_requesting);



            


                //Evenement ACCEPT
                formulaire_validation_pending.addEventListener("click", function(e) {
                    //empeche d'envoyer le formulaire
                    event.preventDefault ? event.preventDefault() : (event.returnValue = false);

                    //On selectionne notre input hidden pour recuperer l'id de la pending demand traitee
                    var input_hidden_pending_accept = document.getElementById('input_hidden_pending_accept' + currentK);

                    //On s'occupe de cacher les formulaire et d'afficher le logo d'attente en attendant que la requete soit terminee
                    var div_overlay_ajax_loader = document.getElementById('div_overlay_ajax_loader');
                    var div_overlay_pending_demands = document.getElementById('div_overlay_pending_demands' + currentK);
                    div_overlay_ajax_loader.style.display = 'flex';
                    div_overlay_pending_demands.style.display = 'none';


                    //Requete sur le serveur pour traiter l'acceptation de l'ajout
                    var xhr_post_accept_ami = new XMLHttpRequest();

                    xhr_post_accept_ami.open('POST', '/accepter_ami/');
                    xhr_post_accept_ami.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    xhr_post_accept_ami.send("id_pending_demand=" + input_hidden_pending_accept.value);

                    console.log('j\envoie les donnes xhr accept');

                    //Une fois que la requete est terminee - callback
                    xhr_post_accept_ami.addEventListener('readystatechange', function() {
                        if (xhr_post_accept_ami.readyState === XMLHttpRequest.DONE) {

                            //On check si on est la derniere demande a traiter
                            //Si ce n'est pas le cas, on passe juste a la suivante
                            if(currentK < response.liste_pendings.length-1){
                                var iplus = currentK + 1;
                                //var div_overlay_pending_demands_a_cacher = document.getElementById('div_overlay_pending_demands' + i);
                                var div_overlay_pending_demands_a_montrer = document.getElementById('div_overlay_pending_demands' + iplus);
                                //div_overlay_pending_demands_a_cacher.style.display = 'none';
                                div_overlay_ajax_loader.style.display = 'none';
                                div_overlay_pending_demands_a_montrer.style.display = 'flex';
                            }
                            else{//Si c'est le cas, il faut re-afficher le chat et mettre a jour la liste des amis
                                //var div_overlay_pending_demands_a_cacher = document.getElementById('div_overlay_pending_demands' + i);
                                //div_overlay_pending_demands_a_cacher.style.display = 'none';

                                var response_accept_ami = JSON.parse(xhr_post_accept_ami.responseText);

                                console.log('resultat response_accept_ami: ', response_accept_ami);

                                //Vidage de la liste des amis connectes
                                var div_affichage_amis_connectes = document.getElementById('div_affichage_amis_connectes');
                                suppression_anciens_elements(div_affichage_amis_connectes);
                                //Vidage de la liste des amis deconnectes
                                var div_affichage_amis_deconnectes = document.getElementById('div_affichage_amis_deconnectes');
                                suppression_anciens_elements(div_affichage_amis_deconnectes);

                                //Affichage des resultat en inserant les donnees dans des DIV
                                for (let i = 0; i < response_accept_ami.liste_amis_a_jour.friends.length; i++){
                                    
                                    (function() {

                                        var currentI = i;
                                        
                                        
                                        
                                        //Ajout des amis de l'utilisateur dans le div_affichage_amis_deconnectes
                                        var div_affichage_amis_deconnectes = document.getElementById('div_affichage_amis_deconnectes');
                                        creation_div_avec_valeur('div_ami_affiche', div_affichage_amis_deconnectes, response_accept_ami.liste_amis_a_jour.friends[currentI].username);


                                        //Pour les utilisateurs connectes il faut les deplacer dans le div_affichage_amis_connectes et leur appliquer le style
                                        var ami_a_modifier = document.getElementById(response_accept_ami.liste_amis_a_jour.friends[currentI].username);
                                        console.log("ami_a_modifier id: ", response_accept_ami.liste_amis_a_jour.friends[currentI].username);

                                        var index_ami_a_modifier = liste_utilisateur_connectes.indexOf(response_accept_ami.liste_amis_a_jour.friends[currentI].username);
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
                                            tab_utilisateurs_deja_appendes.push(response_accept_ami.liste_amis_a_jour.friends[currentI].username);
                                            tab_utilisateurs_deja_appendes.sort();

                                            //On recupere l'index de notre nouvel utilisateur apres tri
                                            var index_ami_position = tab_utilisateurs_deja_appendes.indexOf(response_accept_ami.liste_amis_a_jour.friends[currentI].username);

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
                                
                                //re-affichage du chat sur la derniere demande et on cache le logo d'attente
                                div_overlay_ajax_loader.style.display = 'none';
                                div_genral.style.display = 'flex';
                            }
                        }
                    });
                });


                //Evenement REFUSE
                formulaire_refus_pending.addEventListener("click", function(e) {
                    //empeche d'envoyer le formulaire
                    event.preventDefault ? event.preventDefault() : (event.returnValue = false);

                    //On selectionne notre input hidden pour recuperer l'id de la pending demand traitee
                    var input_hidden_pending_refuse = document.getElementById('input_hidden_pending_refuse' + currentK);

                    //On s'occupe de cacher les formulaire et d'afficher le logo d'attente en attendant que la requete soit terminee
                    var div_overlay_ajax_loader = document.getElementById('div_overlay_ajax_loader');
                    var div_overlay_pending_demands = document.getElementById('div_overlay_pending_demands' + currentK);
                    div_overlay_ajax_loader.style.display = 'flex';
                    div_overlay_pending_demands.style.display = 'none';

                    //Requete sur le serveur pour traiter l'acceptation de l'ajout
                    var xhr_post_refuse_ami = new XMLHttpRequest();

                    xhr_post_refuse_ami.open('POST', '/refuser_ami/');
                    xhr_post_refuse_ami.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    xhr_post_refuse_ami.send("id_pending_demand=" + input_hidden_pending_refuse.value);

                    console.log('j\envoie les donnes xhr refus');

                    //Une fois que la requete est terminee - callback
                    xhr_post_refuse_ami.addEventListener('readystatechange', function() {
                        if (xhr_post_refuse_ami.readyState === XMLHttpRequest.DONE) {
                            //On check si on est la derniere demande a traiter
                            //Si ce n'est pas le cas, on passe juste a la suivante
                            if(currentK < response.liste_pendings.length-1){
                                var iplus = currentK + 1;
                                //var div_overlay_pending_demands_a_cacher = document.getElementById('div_overlay_pending_demands' + i);
                                var div_overlay_pending_demands_a_montrer = document.getElementById('div_overlay_pending_demands' + iplus);
                                //div_overlay_pending_demands_a_cacher.style.display = 'none';
                                div_overlay_ajax_loader.style.display = 'none';
                                div_overlay_pending_demands_a_montrer.style.display = 'flex';
                            }
                            else{//Si c'est le cas, il faut re-afficher le chat et mettre a jour la liste des amis
                                
                                var response_refuse_ami = JSON.parse(xhr_post_refuse_ami.responseText);

                                console.log('resultat response_refuse_ami: ', response_refuse_ami);

                                //Vidage de la liste des amis connectes
                                var div_affichage_amis_connectes = document.getElementById('div_affichage_amis_connectes');
                                suppression_anciens_elements(div_affichage_amis_connectes);
                                

                                //Affichage des resultat en inserant les donnees dans des DIV
                                for (let i = 0; i < response_refuse_ami.liste_amis_a_jour.length; i++){
                                    
                                    (function() {

                                        var currentI = i;
                                        
                                        
                                        //Ajout des amis de l'utilisateur dans le div_affichage_amis_deconnectes
                                        var div_affichage_amis_deconnectes = document.getElementById('div_affichage_amis_deconnectes');
                                        creation_div_avec_valeur('div_ami_affiche', div_affichage_amis_deconnectes, response_refuse_ami.liste_amis_a_jour[currentI].username);


                                        //Pour les utilisateurs connectes il faut les deplacer dans le div_affichage_amis_connectes et leur appliquer le style
                                        var ami_a_modifier = document.getElementById(response_refuse_ami.liste_amis_a_jour[currentI].username);
                                        console.log("ami_a_modifier id: ", response_refuse_ami.liste_amis_a_jour[currentI].username);

                                        var index_ami_a_modifier = liste_utilisateur_connectes.indexOf(response_refuse_ami.liste_amis_a_jour[currentI].username);
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
                                            tab_utilisateurs_deja_appendes.push(response_refuse_ami.liste_amis_a_jour[currentI].username);
                                            tab_utilisateurs_deja_appendes.sort();

                                            //On recupere l'index de notre nouvel utilisateur apres tri
                                            var index_ami_position = tab_utilisateurs_deja_appendes.indexOf(response_refuse_ami.liste_amis_a_jour[currentI].username);

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
                                //re-affichage du chat sur la derniere demande et on cache le logo d'attente
                                div_overlay_ajax_loader.style.display = 'none';
                                div_genral.style.display = 'flex';
                            }
                        }
                    });
                });


                //Evenement ANNULE - On s'occupe jute de cahcer les formulaires les une apres les autre puis re-afficher le chat a la fin
                formulaire_annulation_pending.addEventListener("submit", function(e) {
                    //empeche d'envoyer le formulaire
                    event.preventDefault ? event.preventDefault() : (event.returnValue = false);

                    //pour tous les formulaire sauf le dernier
                    if(currentK < response.liste_pendings.length-1){
                        var iplus = currentK + 1;
                        var div_overlay_pending_demands_a_cacher = document.getElementById('div_overlay_pending_demands' + currentK);
                        var div_overlay_pending_demands_a_montrer = document.getElementById('div_overlay_pending_demands' + iplus);
                        div_overlay_pending_demands_a_cacher.style.display = 'none';
                        div_overlay_pending_demands_a_montrer.style.display = 'flex';
                    }
                    else{//Pour le dernier formulaire
                        var div_overlay_pending_demands_a_cacher = document.getElementById('div_overlay_pending_demands' + currentK);
                        div_overlay_pending_demands_a_cacher.style.display = 'none';
                        div_genral.style.display = 'flex';
                    }
                });
                //On append notre formulaire
                document.body.appendChild(div_overlay_pending_demands);
            })();//fin closure
        }
    }
});