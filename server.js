let cheerio = require("cheerio");
let fetch = require("node-fetch");
let fs = require('fs');
const mongoose = require('mongoose');

let connectDB = async()=>{
    try{
        const conn = await mongoose.connect("mongodb+srv://admin:admin@cluster0.hc3j1.mongodb.net/dbname?retryWrites=true&w=majority", {
            useNewUrlParser: true,
            useUnifiedTopology:true
        });
    }
    catch(err){
        console.log(err);
        process.exit(-1);
    }
};
connectDB();

var schema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    platform:{
        type: String,
        required: true
    },
    parentCategory:{
        type: String,
        required: false
    },
    slug:{
        type:String,
        required:true
    }
});

const CategoryDoc = mongoose.model('category_doc', schema);
schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }
});

const PlatformDoc = mongoose.model('platform_doc', schema);
schema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    description:{
        type:String,
        required:true
    },
    content:{
        type:Object,
        required: true
    },
    platform:{
        type:String,
        required:true
    },
    parentCategory:{
        type:String,
        required:true
    },
    subCategory:{
        type:String,
        required:true
    },
    image_url:{
        type:String,
        required:true
    },
    software_url:{
        type:String,
        required:true
    },
    downloads:{
        type:Number,
        required: true
    },
    program_by:{
        type:String,
        required:true
    },
    license:{
        type:String,
        required:true
    },
    version:{
        type:String,
        required:true
    },
    screenshots:{
        type:Object,
        required:true
    },
    pros:{
        type:Object,
        required:true
    },
    cons:{
        type:Object,
        required:true
    },
    rating:{
        type:Object,
        required:true
    },
    alternate_link:{
        type:String,
        required:true
    },
    slug:{
        type:String,
        required:true
    }
});

const ProgramDoc = mongoose.model('program_doc', schema);

let CreateCategory = async (data) => {
    let category = new CategoryDoc({
        name: data.name,
        slug: data.slug,
        parentCategory: data.parentCategory,
        platform: data.platform
    });
    let output = await category.save(category);
    console.log(output);
    return output;
};
let CreateProgram = async (data) => {
    let program = new ProgramDoc(data);
    let output = await program.save(program);
    return output;
};
let CreatePlatform = async (data) => {
    let platform = new PlatformDoc({
        name: data.name
    });
    let output = await platform.save(platform);
    return output;
};

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
		CreatePlatform({name:val.name})
		.then((data)=>{platforms[key].id=data._id})
		.then(()=>{
			$(`#${val.name.toUpperCase()}-cats a`).each(function(){
				CreateCategory({
					name:$(this).text().trim(),
					slug:$(this).attr("href").split("/").reverse()[0],
					platform:platforms[key].id,
					parentCategory:""
				})
				.then((data)=>{
					platforms[key].categories.push({
						name:data.name,
						slug:data.slug,
						categories:[],
						programs:[],
						id:data._id
					});
				})
			});			
		});
	});
	return process_main_categories();
})
.then((data)=>{
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
				let data = CreateCategory({
					name:$(this).text().trim(),
					slug:$(this).attr("href").split("/").reverse()[0],
					platform:platforms[pl_i].id,
					parentCategory:platforms[pl_i].categories[c_i].id
				})
				platforms[pl_i].categories[c_i].categories.push({
					name:data.name,
					slug:data.slug,
					programs:[],
					id:data._id
				});					
				data = await load_programs(platform.name.toLowerCase(),category.slug);
				platforms[pl_i].categories[c_i].programs = data;
				for(let i = 0; i<platforms[pl_i].categories[c_i].categories.length; i++)
					platforms[pl_i].categories[c_i].categories[i].programs = await load_programs(platform.name, platforms[pl_i].categories[c_i].categories[i].slug);
				console.log("category procesed: ",platform.name,category.name);
				write_to_file();
			});
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
				platforms[i].categories[j].programs[x].platform = platforms[i].id;
				platforms[i].categories[j].programs[x].parentCategory = platforms[i].categories[j].id;
				platforms[i].categories[j].programs[x].subCategory = "";
				await CreateProgram(platforms[i].categories[j].programs[x]);
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
					platforms[i].categories[j].categories[k].programs[x].platform = platforms[i].id;
					platforms[i].categories[j].categories[k].programs[x].parentCategory = platforms[i].categories[j].id;
					platforms[i].categories[j].categories[k].programs[x].subCategory = platforms[i].categories[j].categories[k].id;
					await CreateProgram(platforms[i].categories[j].categories[k].programs[x]);
				}
				write_to_file();
			}
		}
	}
	console.log("all programs processed");
}