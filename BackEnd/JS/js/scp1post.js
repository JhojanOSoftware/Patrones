/* Shim loader to adapt older HTML paths that expect /BackEnd/JS/js/scp1post.js
   This small script dynamically loads the real `scp1post.js` located at
   `/BackEnd/JS/scp1post.js`. */
(function(){
    try {
        var s = document.createElement('script');
        s.src = '/BackEnd/JS/scp1post.js';
        s.defer = true;
        document.head.appendChild(s);
    } catch (e) {
        console.error('Failed to load scp1post shim:', e);
    }
})();
