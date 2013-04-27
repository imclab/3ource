var exec = require('child_process').exec;
var fs = require('fs');

// Options
var cwd = './'; // target git repository directory
cwd = '../three.js/'
var target = 'data/test.json';
var pretty_json = !true;
var pack_json = true;
// End Options

/*
 * TODO - combine both git commands into 1
 * GET Gravatar from emails
 */

var json_format = {
	"hash":"%h",
	"parents":"%p",
	"author":"%an",
	"date":"%at",
	"message":"%s",
	"commitDate":"%ct",
	"files":""
};

var DELIMITER = '|^@^|';
var LINE_DELIMTER = '';
var DOWNLOAD_GRAVATAR = false;

//\\#>.<#/
var json_keys = [];
var pretty_format2 = [];;
for (var k in json_format) {
	json_keys.push(k);
	pretty_format2.push(json_format[k]);
}
pretty_format2 = pretty_format2.join(DELIMITER) + LINE_DELIMTER;

var pretty_format = JSON.stringify(json_format).replace(/\"/g, DELIMITER);

var CMD = 'git log --encoding=UTF-8 --pretty=format:"' + pretty_format2 + '" > result.json';
var RAW_FILES = 'git whatchanged --raw -m --pretty=format:user:%aN%n%ct\!%h --encoding=UTF-8';
//%ct --no-renames  %s 


var commit_files = {};
var commits = [];
var commit_hashes = {};

function get_git_log() {
	var child = exec(CMD, {cwd: cwd},
		function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
			return;
		}
		convert();
	});

}

var rawlogs = exec(RAW_FILES, {cwd: cwd, maxBuffer: 1024 * 1024 * 200},
function (error, stdout, stderr) {
	if (error !== null) {
		console.log('exec error: ' + error);
		return;
	}
	var logs = stdout.split('\n');
	var o = {};
	var log, line2;

	var regex = /(.*)[ ](.*)[ ](\w+)[.]+[ ](\w+)[.]+[ ](.)\t(.*)/;
	// sample format - ":000000 100644 0000000... e69de29... A\tREADME"

	for (i=0,il=logs.length;i<il;i++) {
		log = logs[i];

		if (log.substring(0, 5)=='user:') {
			line2 = logs[i+1].split('!');
			hash = line2[1]

			if (hash!=o.hash) {
				o = {user: log.substring(5), time: line2[0], hash: line2[1], files:[]};
				commits.push(o);
				commit_hashes[hash] = o;
			}
			i++;

		} else if (log.trim() =='') {

		} else {
			e = regex.exec(log)
			// if (e)
			// 	o.files.push({file: e[6], op: e[5], from: e[3], to: e[4]});
			// else
			// 	console.log('Error at line ' + i, logs[i-1], logs[i], logs[i+1]);
			if (e.length) {
				o.files.push([e[6], e[5], e[3], e[4]].join('|'))
			}

		}

	}

	console.log('Found ' + commits.length + ' commits');

	// json = JSON.stringify(commits, null, '\t');
	// fs.writeFileSync('data/files.json', json, 'utf8');
	get_git_log();
	console.log('done');
	// console.log(stdout);
});

/*
a90c4e1:
   [ 'A\tsrc/Class.js',
     'A\tsrc/cameras/Camera.js',
*/

function json_pack(a) {
	// From [{a, b, c}, {a, b, c}] => {a:[], b:[], c:[]}
	var packed = {}, k;
	for (k in json_format) {
		packed[k] = [];
	}
	var i,il, e;
	for (i=0, il=a.length; i<il; i++) {
		e = a[i];
		for (k in json_format) {
			packed[k].push(e[k]);
		}
	}
	return packed;
}

function json_unpack(packed) {
	// From {a:[], b:[], c:[]} => [{a, b, c}, {a, b, c}]
	var unpacked = [], k, il;
	for (k in packed) {
		il = packed[k].length;
		break;
	}

	var i, o;
	for (i=0;i<il;i++) {
		o = {};
		for (k in packed) {
			o[k] = packed[k][i];
		}
		unpacked.push(o);
	}
	return unpacked;

}


function convert() {

	var result = fs.readFileSync(cwd + 'result.json', 'utf8');
	fs.unlinkSync(cwd + 'result.json');

	var log = [];
	var lines = result.split(LINE_DELIMTER+'\n');
	// lines.pop();
	for (var i=0;i<lines.length;i++) {
		var line = lines[i].split(DELIMITER);
		var o = {};
		for (var j=0;j<line.length;j++) {
			o[json_keys[j]] = line[j];
		}
		log.push(o);
	}

	console.log('log length: '  + log.length);

	var commit;
	for (var i=0;i<log.length;i++) {
		commit = log[i];
		if (!(commit.hash in commit_hashes)) {
			// console.log('too bad', commit);
			commit.files= [];
		} else {
			commit.files = commit_hashes[commit.hash].files;
			// commit.files = commits[i].files;
		}
		commit.parents = commit.parents != '' ? commit.parents.split(' '): [];
		commit.date = parseInt(commit.date);
	}

	if (pack_json) log = json_pack(log);

	var json = JSON.stringify(log, null,
		pretty_json ? '\t' : '');

	fs.writeFileSync(target, json, 'utf8');


}