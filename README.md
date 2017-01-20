Javascript Tetris using SAM pattern
=================

An HTML5 Tetris Game

 * [play the game](https://ashalkhakov.github.io/sam-tetris/)
 * based on [source](https://github.com/jakesgordon/javascript-tetris)
   and the corresponding [blog article](http://codeincomplete.com/posts/2011/10/10/javascript_tetris/)

I tried very hard to structure it according to
the [SAM pattern](http://sam.js.org/). The end result seems very
modular.

 * the original code used invalidation flags to check if it needed to
   refresh parts of the screen -- not sure if this is still needed?
   I've removed it for the time being; still we could add it back, I
   guess, by extending the "present" function of the model?

FUTURE
======

 * menu
 * animation and fx
 * levels
 * high scores
 * touch support
 * music and sound fx
 * mobile version


License
=======

[MIT](http://en.wikipedia.org/wiki/MIT_License) license.

