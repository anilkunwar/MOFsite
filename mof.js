	$(function() {
	// VARIABLES 
	var name = "DOTSOV"; // name of initial load, subsequently name of loaded file
	var nameString = "./MOFs/" + name + ".cif"; // path to loaded file
	var cellA = 0;
	var cellB = 0;
	var cellC = 0;
	var probeNumber = 1000;
	var currentNumber = 0;

	// JSmol config
	 var Info = {
 color: "#FFFFFF", // white background (note this changes legacy default which was black)
   height: "120%",      // pixels (but it may be in percent, like "100%")
   width: "100%",
  use: "HTML5",     // "HTML5" or "Java" (case-insensitive)
   j2sPath: "./jsmol/j2s",          // only used in the HTML5 modality
   jarPath: "java",               // only used in the Java modality
   jarFile: "JmolApplet0.jar",    // only used in the Java modality
   isSigned: false,               // only used in the Java modality
   serverURL: "php/jsmol.php",  // this is not applied by default; you should set this value explicitly
  // src: initialMOF,          // file to load
   script: "set antialiasDisplay;background white; set appendNew false; load ./MOFs/DOTSOV.cif {1 1 1}; animation mode palindrome; animation on;",       // script to run
   defaultModel: "",   // name or id of a model to be retrieved from a database
   addSelectionOptions: false,  // to interface with databases
   debug: false
 };	 

// JSmol Applet
var myJmol = Jmol.getAppletHtml("jmolApplet0", Info);

$(document).ready(function() {
  $("#viewer")
  .append(myJmol)
  .addClass("padded");
})



// define the web worker, overlap_worker.js which performs MC computations in the background

if (typeof(w) == "undefined") {
			var worker = new Worker("overlap_worker.js");
		}

// get JSON files which act as hashtables for MOF generation
$.getJSON("MOF-database.json", function(data) {
			MOFdata = data;
			
		});
$.getJSON("Blocks-database.json", function(data) {
			blockdata = data;
		});
		
		
		 // x1, y1, z1 checked by default
		$('input:radio[name="x"]').filter('[value="1"]').attr('checked', true);
		$('input:radio[name="y"]').filter('[value="1"]').attr('checked', true);
		$('input:radio[name="z"]').filter('[value="1"]').attr('checked', true);
		
		// MOF generation accordion
		$(".accordion").accordion(); 
		
		// prevent form submission when supercell is submitted
		$("#supercellSelector").submit(function(event) {
			event.preventDefault();
		});
		
		//  load supercell of current structure based on radio input
		$("#submitSupercell").click(function() {
			var x = $('input[name=x]:checked').val();
			var y = $('input[name=y]:checked').val();
			var z = $('input[name=z]:checked').val();
			loadSupercell(x, y, z); 
		});
		
		
		$("#runSimulation").click(function() {		
			var modelInfo = Jmol.getPropertyAsArray(jmolApplet0, "fileInfo");
			cellA = modelInfo['models'][0]['_cell_length_a'];
			cellB = modelInfo['models'][0]['_cell_length_b'];
			cellC = modelInfo['models'][0]['_cell_length_c'];	
			Jmol.script(jmolApplet0, 'define MOF C*,H*,N*,O*; define nah A*');
			//Jmol.script(jmolApplet0, 'select *; var s = {selected}.lines.length; print s;');
			//var currentShown = Jmol.evaluateVar(jmolApplet0, "{*}.lines.length");
			currentNumber = Jmol.getPropertyAsArray(jmolApplet0, "atomInfo").length;
			console.log(currentNumber);
			
			//Jmol.script(jmolApplet0, 'set autobond off; load APPEND ./MOFs/Nitrogens.cif;');
			
			// get cell length
			
			//console.log(modelInfo['models'][0]['_cell_length_a']);
			
			/////
			var coordinates = '';
			var coordArray = [];
			var inlineString = probeNumber.toString() + "\n" + "Probes\n";
			
			
			for (i=1;i<=probeNumber;i++) {
				coordinates = getRandomCo(i);
				
				inlineString+= ' B ' + coordinates + '\n';
			}
		
		//var x = Jmol.evaluateVar(jmolApplet0, "script('set autobond off; var q = " + inlineString  +  ";  load APPEND " + '@q' + "; select on {B* and within(0.8, O*, C*, H*)}; var s = {selected}.length; print s;')");
		Jmol.script(jmolApplet0, 'set autobond off; var q = "' + inlineString + '";  load APPEND "@q"; select on {B* and within(0.8, O*, C*, H*)}; var s = {selected}.length; print s;');

		var molInfo = Jmol.getPropertyAsArray(jmolApplet0, "atomInfo");
		console.log(molInfo[0]['x']);
		worker.postMessage([coordinateArray, molInfo, currentNumber]);
		worker.onmessage = function(event) {
			var overString = event.data;
			console.log(overString);
			var count = (overString.match(/B/g) || []).length;
			console.log(count);
			Jmol.script(jmolApplet0, 'select ' + overString + ';'); 
			var numberSelfOverlap = (overString.length+2)/6;
			console.log(numberSelfOverlap);
			$("#addme").append('<br /><br />' + probeNumber + ' probes used, ' + count + ' probes overlapped either with each other or with the given structure.');
			//Jmol.script(jmolApplet0, 'console; select {B* and visible}; var q = {selected}.length; print q;');
			
			var molInfo = Jmol.getPropertyAsArray(jmolApplet0, "atomInfo");
			
			
			
		  }
		
		
		

			var upperBound = currentNumber + probeNumber; 
			//Jmol.script(jmolApplet0, 'function test() {for (j=' + currentNumber + ';j<=' + upperBound + ';j++) {  var k = "B" + j; print k; select on add @k and within(1.0, B* and not @k); var r = {selected}.length; print r;}; }; test(); ');	

			
		
		return true;
			
		});
		var coordinateArray = [];
		function getRandomCo(p) {
			var rX = (Math.random() * cellA).toFixed(5);
			var rY = (Math.random() * cellB).toFixed(5);
			var rZ = (Math.random() * cellC).toFixed(5);
			var coords = rX + ' ' + rY + ' ' + rZ;
			coordinateArray[p-1] = [rX, rY, rZ]; 
			return coords; 
		}
		
		$("#remove").click(function() {

			// check overlap with MOF then with other B
			//////////////////
			
			// zap to remove atoms
			//Jmol.script(jmolApplet0, 'define MOF *; restrict MOF;');
		});
		
		$("#spacefill").click(function() {
			Jmol.script(jmolApplet0,'select *; cartoons off; spacefill only;');
		}); 
		
				$("#ballStick").click(function() {
			Jmol.script(jmolApplet0,'select *; cartoons off; spacefill 23%; wireframe 0.15;');		
		}); 
		

		
		$('#generate').click(function() {
		
			
			
			 var hashArray =[];
			 i=0;
			 $(".selected").each(function () {
				hashArray[i] = blockdata[$(this).attr('hash')];
				i++;
			 });

			hashArray = hashArray.sort();
			hash = hashArray.join('');
			console.log(hash);
			console.log(MOFdata);
			mof = MOFdata[hash];
			console.log(mof);
			  if (mof == null) {
				  $("#mofFail").show();
				  clearAll();
			  }
			 else {
			loadViewer(mof['name']);
			
			$('#learnMore').attr('href',mof['link']); 
			
			  }
			 $(".buildBlock").removeClass("selected");
		 
		});
		
		
		
		
		
		
		
		$("#mcDemo").click(function() {
			name = "Kr5";
			console.log(name);
			Jmol.script(jmolApplet0, 'load ./MOFs/' + name + '.cif {1 1 1};');
		});
		
		function loadViewer(name) {
			name = name.toString();
			Jmol.script(jmolApplet0,'load ./MOFs/' + name + '.cif {1 1 1};');
		}
		
		function loadSupercell(x,y,z) {
			Jmol.script(jmolApplet0, 'load ./MOFs/' + name + '.cif {' + x + ' ' + y + ' ' + z + '}');
		}
		
		function clearAll() {
			$(".buildBlock").removeClass("selected");
			hashArray = [];	
			
		}
		
		$("#infoBox").hide();
		$("#maker").hide();
		$("#MCContainer").hide();
		$("#supercellContainer").hide();
		$('#clear').click(function() {
			clearAll();
			$("#mofFail").hide();	
		});
		$("#clearMC").click(function() {
			Jmol.script(jmolApplet0, 'zap; set autobond on; load ./MOFs/' + name + '.cif {1 1 1};');
		});
		
		$("#makeButton").click(function() {
			
				if ( $('#maker').is(':visible') ) {
					
					$("#makeIconDown").hide();
					$('#makeIconRight').show();
					
					$("#maker").slideUp("slow");
				}
				else {
					$("#makeIconRight").hide();
					$('#makeIconDown').show();
				
					$("#maker").slideDown("slow");
					
				}
		});
		
		$("#showMCButton").click(function() {
			
				if ( $('#MCContainer').is(':visible') ) {
					
					$("#MCIconDown").hide();
					$('#MCIconRight').show();
					
					$("#MCContainer").slideUp("slow");
				}
				else {
					$("#MCIconRight").hide();
					$('#MCIconDown').show();
				
					$("#MCContainer").slideDown("slow");
					
				}
		});
				$("#supercellButton").click(function() {
					/*
			
				if ( $('#supercellContainer').is(':visible') ) {
					
					$("#spIconDown").hide();
					$('#spIconRight').show();
					
					$("#supercellContainer").slideUp("slow");
				}
				else {
					$("#spIconRight").hide();
					$('#spIconDown').show();
				
					$("#supercellContainer").slideDown("slow");
					
				} */
				console.log('everythings ok');
		});
		
		$(".buildBlock").click(function () {
			if ($("#mofFail").is(":visible")) {
				$("#mofFail").hide();
			}
			$(this).toggleClass("selected");
		});
		
		
		// fix ajax json call 
		// allowing json object to be retrieved
		$.ajaxSetup({beforeSend: function(xhr){
  if (xhr.overrideMimeType)
  {
    xhr.overrideMimeType("application/json");
  }
}
});
////////////


 });
 
