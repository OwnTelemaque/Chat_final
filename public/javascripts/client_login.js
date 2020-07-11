//Fonctions necessaires
function premiere_lettre_MAJ(chaine){
    return (chaine+'').charAt(0).toUpperCase()+chaine.substr(1);
}


//Cet evenement me permet de mettre en forme le nom d'utilisateur avant qu'il ne soit envoyer lors du login. Pour qu'il soit sous la forme Majminminmin
document.getElementById("formulaire_connexion").onsubmit = function(){
    
    var input_username = document.getElementById("id_username");
    var id_username_modifie = input_username.value;
    console.log('id_username: ', id_username_modifie);
    id_username_modifie = premiere_lettre_MAJ(id_username_modifie);
    input_username.value = id_username_modifie;
};

//Montrer le mot de passe
document.getElementById("img_show_password").onmousedown = function(){
    var input_password = document.getElementById("input_password");
    input_password.type = 'text';
};
//Cacher le mot de passe
document.getElementById("img_show_password").onmouseup = function(){
    var input_password = document.getElementById("input_password");
    input_password.type = 'password';
};