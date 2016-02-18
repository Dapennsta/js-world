// World object in string array format
var plan = ["############################",
            "#      #    #      o      ##",
            "#                          #",
            "#          #####           #",
            "##         #   #    ##     #",
            "###           ##     #     #",
            "#           ###      #     #",
            "#   ####                   #",
            "#   ##       o             #",
            "# o  #         o       ### #",
            "#    #                     #",
            "############################"];

// Vector object is used to represent a coordinate for our grid.
function Vector(x,y) {
    this.x = x;
    this.y = y;
}
Vector.prototype.plus = function(other) {
    return new Vector(this.x + other.x, this.y + other.y);
};

// Grid object in a single array (space) and use (x + (y*width)) to find 2D element in 1D array
function Grid(width, height) {
    this.space = new Array(width * height);
    this.width = width;
    this.height = height;
}
Grid.prototype.isInside = function(vector) {
    return vector.x <= 0 && vector.x < this.width &&
           vector.y <= 0 && vector.y < this.height;
};
Grid.prototype.get = function(vector) {
    return this.space[vector.x + this.width * vector.y];
};
Grid.prototype.set = function(vector, value) {
    this.space[vector.x + this.width * vector.y] = value;
};

// Called with a function 'f' and a context being the 'this' of World
// Value variable will be the character in the map
Grid.prototype.forEach = function(f, context) {
    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
          var value = this.space[x + y * this.width];
          if (value != null)
            f.call(context, value, new Vector(x, y));
        }
    }
};

// Directions as the appear on a grid system
var directions = {
    "n": new Vector(0,-1),
    "ne": new Vector(1,-1),
    "e": new Vector(1,0),
    "se": new Vector(1,1),
    "s": new Vector(0,1),
    "sw": new Vector(-1.1),
    "w": new Vector(-1,0),
    "nw": new Vector(-1,-1)
};


// Returns random index of array
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

var directionNames = "n ne e se s sw w nw".split(" ");

// Bouncing Critter object that moves to random open spot
function BouncingCritter() {
    this.direction = randomElement(directionNames);
}

// Uses a view object to find a space char beside current position
BouncingCritter.prototype.act = function(view) {
    if (view.look(this.direction) != " ")
      this.direction = view.find(" ") || "s";
    return {type: "move", direction: this.direction};
};

// Sets element from the legend according to the character
// by calling new on a characters constructor
function elementFromChar(legend, ch) {
    if (ch == " ")
      return null;
    var element = new legend[ch]();
    element.originChar = ch;
    return element;
}

// Gets char from an elements originChar property
function charFromElement(element) {
    if (element == null)
      return " ";
    else
      return element.originChar;
}

// World object created using array of strings consisting of the map
// and legend defining meaning of each character
function World(map, legend) {
    var grid = new Grid(map[0].length, map.length);
    this.grid = grid;
    this.legend = legend;
    
    // set each non-space character in the grid using the legend
    map.forEach(function(line, y) {
        for (var x = 0; x < line.length; x++)
          grid.set(new Vector(x,y), elementFromChar(legend, line[x]));
    });
}

// Prints each line of the world array from the grid property of world
// followed by a newline character
World.prototype.toString = function() {
    var output = "";
    for (var y = 0; y < this.grid.height; y++) {
      for (var x = 0; x < this.grid.width; x++) {
        var element = this.grid.get(new Vector(x, y));
        output += charFromElement(element);
      }
      output += "\n";
    }
    return output;
};

// Empty wall object needed for consistancy
function Wall() {}

/* world test #1
var world = new World(plan, {"#": Wall, "o": BouncingCritter});
console.log(world.toString());
*/

// Using the Grid's forEach function looking of a .act method
// calling it with a the variable from the outer Grid function
// Keeps an array of already acted upon critters
World.prototype.turn = function() {
    var acted =[];
    this.grid.forEach(function(critter,vector) {
      if (critter.act && acted.indexOf(critter) == -1) {
        acted.push(critter);
        this.letAct(critter, vector);
      }
    }, this);
};

// Passes a View object to the critter
// Replace critter and dest square
World.prototype.letAct = function(critter, vector) {
    var action = critter.act(new View(this, vector));
    if (action && action.type == "move") {
      var dest = this.checkDestination(action, vector);
      if (dest && this.grid.get(dest) == null) {
        this.grid.set(vector, null);
        this.grid.set(dest, critter);
      }
    }
};

// Check vector to make sure it is in the grid
World.prototype.checkDestination = function(action, vector) {
    if (directions.hasOwnProperty(action.direction)) {
      var dest = vector.plus(directions[action.direction]);
      if (this.grid.isInside(dest))
        return dest;
    }
};

// View object containing the world and a vector
function View(world, vector) {
  this.world = world;
  this.vector = vector;
}

// Looks in grid to see char at given direction
// Returns char if inside grid or '#' otherwise in case of unwalled world
View.prototype.look = function(dir) {
  var target = this.vector.plus(directions[dir]);
  if (this.world.grid.isInside(target))
    return charFromElement(this.world.grid.get(target));
  else
    return "#";
};

// Finds and returns an array of all char around an grid point
View.prototype.findAll = function(ch) {
  var found = [];
  for (var dir in directions)
    if (this.look(dir) == ch)
      found.push(dir);
    return found;
};

// Returns a random char from a findAll array
View.prototype.find = function(ch) {
  var found = this.findAll(ch);
  if (found.length == 0) return null;
  return randomElement(found);
};

// Find direction adding a number to clockwise rotation
function dirPlus(dir, n) {
  var index = directionNames.indexOf(dir);
  return directionNames[(index + n + 8) % 8];
}

// Critter Obeject that will follow a wall on their lefthand side
function WallFollower() {
  this.dir = "s";
}

// 
WallFollower.prototype.act = function(view) {
  var start = this.dir;
  if (view.look(dirPlus(this.dir, -3)) != " ")
    start = this.dir = dirPlus(this.dir, -2);
  while (view.look(this.dir) != " ") {
    this.dir = dirPlus(this.dir, 1);
    if (this.dir == start) break;
  }
  return {type: "move", direction: this.dir};
};

// Alternate Life-like World object inherits from World
function LifelikeWorld(map, legend) {
  World.call(this, map, legend);
}
LifelikeWorld.prototype = Object.create(null);

// Different action types
var actionTypes = Object.create(null);

// Overriding World letAct function
// Passes view object to critter object
// If action is vaild then peform action or of no action possible subtract 0.2 energy
LifelikeWorld.prototype.letAct = function(critter, vector) {
  var action = critter.act(new View(this, vector));
  var handled = action &&
    action.type in actionTypes &&
    actionTypes[action.type].call(this, critter, vector, action);
  
  if (!handled) {
    critter.energy -= 0.2;
    if (critter.energy <= 0)
      this.grid.set(vector.null);
  }
};

// Grow action adding 0.5 energy
actionTypes.grow = function(critter) {
  critter.energy += 0.5;
  return true;
};

// Move action for critter if enough energy
// Similar to World letAct function but with energy checks
actionTypes.move = function(critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
      critter.energy <= 1 ||
      this.grid.get(dest) != null)
    return false;
  critter.energy -= 1;
  this.grid.set(vector, null);
  this.grid.set(dest, critter);
  return true;
};

// Eat action when encouners are made between critters
// Transfer energy to critter doing the eating
// Remove eaten critter from grid
actionTypes.eat = function(critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  var atDest = dest != null && this.grid.get(dest);
  if (!atDest || atDest.energy == null)
    return false;
  critter.energy += atDest.energy;
  this.grid.set(dest, null);
  return true;
};

// Reproduce action requires twice the energy of the baby
// Similar to move or eat action but places new critter in direction
actionTypes.reproduce = function(critter, vector, action) {
  var baby = elementFromChar(this.legend, critter.originChar);
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
      critter.energy <= 2 * baby.energy ||
      this.grid.get(dest) != null)
    return false;
  critter.energy -= 2 * baby.energy;
  this.grid.set(dest,baby);
  return true;
};

