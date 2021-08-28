let cheerio = require("cheerio");
let fetch = require("node-fetch");
let fs = require('fs');

platforms = [ 
	{name:"Windows", categories:[]},
	{name:"Mac", categories:[]},
	{name:"Android", categories:[]}
];
fetch("https://en.download.it/")
.then((res)=>res.text())
.then((data)=>{ 
	let $ = cheerio.load(data);
	platforms.forEach((val, key)=>{
		$(`#${val.name.toUpperCase()}-cats a`).each(function(){
			platforms[key].categories.push({
				name:$(this).text().trim(),
				slug:$(this).attr("href").split("/").reverse()[0],
				categories:[],
				programs:[]
			});
		});
	});
	write_to_file();
	return process_main_categories();
})
.then((data)=>{
	write_to_file();
	return process_all_programs();
})
.then((data)=>{
	write_to_file();
})
.catch((err)=>{console.log(err)});


function write_to_file() {
	fs.writeFile("output.json", JSON.stringify(platforms), 'utf8', function (err) {
	    if (err) {
	        console.log("An error occured while writing JSON Object to File.");
	        return console.log(err);
	    }
	 	console.log("JSON file has been saved.");
	});	
}

async function process_main_categories() {
	console.log("listing all categories");
	for(let pl_i = 0; pl_i<platforms.length; pl_i++){
		let platform = platforms[pl_i];
		for(let c_i =0; c_i<platform.categories.length; c_i++){
			let category = platform.categories[c_i];
			console.log("category processing: ",platform.name,category.name);
			let ft = await fetch(`https://en.download.it/${platform.name.toLowerCase()}/${category.slug}`)
			let data = await ft.text();
			let $ = cheerio.load(data);
			$(".flcats a").each(function(){
				platforms[pl_i].categories[c_i].categories.push({
					name:$(this).text().trim(),
					slug:$(this).attr("href").split("/").reverse()[0],
					programs:[]
				});
			});
			data = await load_programs(platform.name.toLowerCase(),category.slug);
			platforms[pl_i].categories[c_i].programs = data;
			for(let i = 0; i<platforms[pl_i].categories[c_i].categories.length; i++)
				platforms[pl_i].categories[c_i].categories[i].programs = await load_programs(platform.name, platforms[pl_i].categories[c_i].categories[i].slug);
			console.log("category procesed: ",platform.name,category.name);
			write_to_file();
		}
	}
	console.log("All categories listed");
}

async function load_programs(pl, cat) {
	console.log("All programs listing for: ", pl, cat);
	pl = pl.toLowerCase();
	let programs = [];
	let n = 1;
	for(let i = 1; i<=n; i++) {
		let ft = await fetch(`https://en.download.it/${pl}/${cat}?page=${i}`);
		let dd = await ft.text();
		let $ = cheerio.load(dd);
		if($('.last_page a').length!==0)
			n = parseInt($('.last_page a').attr('href').split('/').reverse()[0].split('=').reverse()[0]);
		$('.hvr-glow a').each(function(){
			programs.push({
				link:$(this).attr('href')
			});
		});
		console.log("processing: ",pl,cat, " page ", i);
	}
	console.log("All programs listed for: ", pl, cat);
	return programs;
}

async function process_all_programs() {
	console.log("processing all programs");
	for(let i = 0; i<platforms.length; i++){
		for(let j = 0; j<platforms[i].categories.length; j++) {
			for(let x = 0; x<platforms[i].categories[j].programs.length; x++){
				let link = platforms[i].categories[j].programs[x].link;
				console.log("processing software:", link);
				let ft = await fetch(link.indexOf("http")==-1?'https:'+link:link);
				let data = await ft.text();
				let $ = cheerio.load(data);
				let content = [];
				let pros = [];
				let cons = [];
				let ss = [];
				$("#prg-screenshots img").each(function(){ ss.push($(this).attr("data-src")); })
				$("ul").eq(0).children("*").each(function(){ pros.push($(this).text()) })
				$("ul").eq(1).children("*").each(function(){ cons.push($(this).text()) })
				$("#prg-review p").each(function(){ if($(this).text()!=="Pros" && $(this).text()!=="Cons") content.push("content:"+$(this).text());})
				platforms[i].categories[j].programs[x] = {
				title:$("h1").eq(0).text(),
				description:$("h2").eq(0).text(),
				license:$(".val-wrapper").eq(1).text(),
				program_by:$(".val-wrapper").eq(2).text(),
				version:$(".val-wrapper").eq(3).text(),
				content:content,
				rating:{value:$(".vote-wrapper").eq(0).attr("data-average")/2, count:$(".vote-count").eq(0).text().split(' ')[0].substring(1)},
				pros:pros,
				cons:cons,
				downloads:parseInt($(".vote-count").eq(0).text().split(' ')[0].substring(1).replace(/,/g,'')),
				slug:link.split("//")[1].split(".")[0],
				screenshots:ss,
				image_url:$("#prg-main img").eq(0).attr("src")};
				ft = await fetch(`https://${platforms[i].categories[j].programs[x].slug}.en.download.it/download`);
				data = await ft.text();
				$ = cheerio.load(data);
				platforms[i].categories[j].programs[x].software_link = $(".dit-dlbtn").eq(0).attr("href");
				platforms[i].categories[j].programs[x].alternate_link = $(".dit-dlbt-notes a").eq(0).attr("href");
			}
			write_to_file();
			for(let k = 0; k<platforms[i].categories[j].categories.length; k++){
				for(let x = 0; x<platforms[i].categories[j].categories[k].programs.length; x++){
					let link = platforms[i].categories[j].categories[k].programs[x].link;
					console.log("processing software:", link);
					let ft = await fetch(link.indexOf("http")==-1?'https:'+link:link);
					let data = await ft.text();
					let $ = cheerio.load(data);
					let content = [];
					let pros = [];
					let cons = [];
					let ss = [];
					$("#prg-screenshots img").each(function(){ ss.push($(this).attr("data-src")); })
					$("ul").eq(0).children("*").each(function(){ pros.push($(this).text()) })
					$("ul").eq(1).children("*").each(function(){ cons.push($(this).text()) })
					$("#prg-review p").each(function(){ if($(this).text()!=="Pros" && $(this).text()!=="Cons") content.push("content:"+$(this).text());})
					platforms[i].categories[j].categories[k].programs[x] = {
					title:$("h1").eq(0).text(),
					description:$("h2").eq(0).text(),
					license:$(".val-wrapper").eq(1).text(),
					program_by:$(".val-wrapper").eq(2).text(),
					version:$(".val-wrapper").eq(3).text(),
					content:content,
					rating:{value:$(".vote-wrapper").eq(0).attr("data-average")/2, count:$(".vote-count").eq(0).text().split(' ')[0].substring(1)},
					pros:pros,
					cons:cons,
					downloads:parseInt($(".vote-count").eq(0).text().split(' ')[0].substring(1).replace(/,/g,'')),
					slug:link.split("//")[1].split(".")[0],
					screenshots:ss,
					image_url:$("#prg-main img").eq(0).attr("src")};
					ft = await fetch(`https://${platforms[i].categories[j].categories[k].programs[x].slug}.en.download.it/download`);
					data = await ft.text();
					$ = cheerio.load(data);
					platforms[i].categories[j].categories[k].programs[x].software_link = $(".dit-dlbtn").eq(0).attr("href");
					platforms[i].categories[j].categories[k].programs[x].alternate_link = $(".dit-dlbt-notes a").eq(0).attr("href");
				}
				write_to_file();
			}
		}
	}
	console.log("all programs processed");
}