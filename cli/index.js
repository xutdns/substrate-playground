const term = require( 'terminal-kit' ).terminal;
const Docker = require('dockerode');

var docker = new Docker();

docker.run('ubuntu', ['bash', '-c', 'uname -a'], process.stdout).then(function(data) {
    var output = data[0];
    var container = data[1];
    console.log(output.StatusCode);
    return container.remove();
  }).then(function(data) {
    console.log('container removed');
  }).catch(function(err) {
    console.log(err);
  });

term.green( "My name is %s, I'm %d.\n" , 'Jack' , 32 ) ;

term.cyan( 'There are doorways south and west.\n' ) ;

var items = [
	'a. Go south' ,
	'b. Go west' ,
	'c. Go back to the street'
] ;

term.singleColumnMenu( items , function( error , response ) {
	term( '\n' ).eraseLineAfter.green(
		"#%s selected: %s (%s,%s)\n" ,
		response.selectedIndex ,
		response.selectedText ,
		response.x ,
		response.y
	) ;
	process.exit() ;
} ) ;