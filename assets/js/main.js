const {ipcRenderer} = require('electron');
const dialog = require('electron').remote.dialog 

var fs = require("fs");
var path = require("path");

const JIMP = require("JIMP");
const AVERAGER = require("image-average-color");

var OUTPUT_DIR = path.join(__dirname, "output");

function log(message){
	console.log(message);
	var msg = $('<span style="display:block; padding-left:5px; padding-right:5px;"></span>').text(message);
	$("#dock-console").append(msg);
}

$(document).ready(function(){

	log("Application Ready");

	$("#choose-silmeria-dir").click(function(e){
		e.preventDefault();

		dialog.showOpenDialog({

			title : "Open Directory",
			properties : ["openDirectory"],
			buttonLabel : "Select Silermia Directory"

		}, function(directoryPathArr){

			if (typeof directoryPathArr[0] == "undefined"){
				return;
			}

			var directoryPath = directoryPathArr[0];

			$("#choose-silmeria-dir-span").val(directoryPath);

			validateSilmeriaDirectory(directoryPath);

		})

		return false;
	})

	function validateSilmeriaDirectory(directoryPath){

		let didFail = false;

		if (fs.existsSync(path.join(directoryPath, "/@Resources"))) {

			$("#notif-resources").addClass("active");

			if (fs.existsSync(path.join(directoryPath, "/@Resources/Icons"))) {
				$("#notif-icons-dir").addClass("active");
			} else {
				$("#notif-icons-dir").removeClass("active");
				didFail = true;
			}

			if (fs.existsSync(path.join(directoryPath, "/@Resources/Icons.ini"))) {
				$("#notif-icons").addClass("active");
			} else {
				$("#notif-icons").removeClass("active");
				didFail = true;
			}

			if (fs.existsSync(path.join(directoryPath, "/@Resources/Settings.ini"))) {
				$("#notif-settings").addClass("active");
			} else {
				$("#notif-settings").removeClass("active");
				didFail = true;
			}

		} else {

			$("#notif-resources").removeClass("active");
			$("#notif-icons-dir").removeClass("active");
			$("#notif-icons").removeClass("active");
			$("#notif-settings").removeClass("active");
			didFail = true;

		}

		if (didFail){
			log("❌ Invalid Silmeria Dock Directory selected");
			$("#directory-error").show();
			$("#main-window").hide();
		} else {
			log("✔️ Silmeria Dock Directory selected");
			OUTPUT_DIR = path.join(directoryPath, "/@Resources");
			$("#directory-error").hide();
			$("#main-window").show();
		}

	}

	//

	$(".icon-container").empty();

	var item_sort = new Sortable($(".icon-container")[0], {
		draggable : ".icon-item",
		handle : ".drag-handle",
		animation : 150
	}) 

	var icon_tracker = {};
	var current_id = "";

	$("#add-icon").click(function(e){

		e.preventDefault();

		$("#modal-name").val("");
		$("#modal-app-dir").val("");
		$("#modal-icon0-span").val("");

		$("#modal-title").text("Add Launcher Icon");

		$("#icon-modal").modal();

		current_id = makeid(8);

		return false;
	})

	$("#modal-app-choose").click(function(e){
		e.preventDefault();

		dialog.showOpenDialog({

			title : "Choose Program",
			properties : ["openFile"],
			buttonLabel : "Select Application Launcher"

		}, function(applicationPathArr){

			if (typeof applicationPathArr[0] == "undefined"){
				return;
			}

			var applicationPath = applicationPathArr[0];

			$("#modal-app-dir").val(applicationPath);

		})

		return;
	})

	$("#modal-icon-choose").click(function(e){
		e.preventDefault();

		dialog.showOpenDialog({

			title : "Choose Base Icon",
			properties : ["openFile"],
			buttonLabel : "Select Icon",
			filters : [
				{
					name : "Images",
					extensions : ["png", "jpg", "jpeg"]
				}
			]

		}, function(iconPathArr){

			if (typeof iconPathArr[0] == "undefined"){
				return;
			}

			var iconPath = iconPathArr[0];

			$("#modal-icon0-span").val(iconPath);

		})

		return;
	})

	//

	$("#modal-save").click(function(e){
		e.preventDefault();

		icon_tracker[current_id] = {
			name : $("#modal-name").val(),
			application_dir : $("#modal-app-dir").val(),
			icon_dir : $("#modal-icon0-span").val()
		}

		var icon_item = $(`.icon-container > .icon-item[icon_id="${current_id}"]`);

		var isNew = false;

		if (icon_item.length == 0){

			// New Icon Item

			icon_item = $('<div class="icon-item">');
			icon_item.append($('<div class="drag_handle"><i class="fas fa-sort"></i></div><img class="base-icon" src="https://via.placeholder.com/48.png" width="48" height="48" /><div><span class="name">Chrome</span><span class="dir"><i class="fa fa-terminal"></i>&quot;C:\Users\Mike\Program Files\Google\Chrome.exe&quot;</span></div><button class="btn btn-primary btn-edit" type="button">Edit</button><button class="btn btn-danger btn-delete" type="button"><i class="fas fa-trash"></i></button>'));
			icon_item.attr("icon_id", current_id);

			isNew = true;

		}

		icon_item.find("div > span.name").text(icon_tracker[current_id].name);
		icon_item.find("div > span.dir").html('<i class="fa fa-terminal"></i>' + icon_tracker[current_id].application_dir);
		icon_item.find("img.base-icon").attr("src", "file://" + icon_tracker[current_id].icon_dir);

		icon_item.children(".btn-edit").click(function(e){
			e.preventDefault();

			var id = $(this).parent().attr("icon_id");
			var app_data = icon_tracker[id];
			
			$("#modal-name").val(app_data.name);
			$("#modal-app-dir").val(app_data.application_dir);
			$("#modal-icon0-span").val(app_data.icon_dir);

			$("#modal-title").text("Edit Launcher Icon");

			$("#icon-modal").modal();

			current_id = id;

			return false;
		})

		icon_item.children(".btn-delete").click(function(e){
			e.preventDefault();

			var id = $(this).parent().attr("icon_id");
			delete icon_tracker[id];
			$(this).parent().remove();
			
			return false;
		})

		if (isNew){
			icon_item.appendTo($(".icon-container"));
		}

		current_id = null;

		$("#icon-modal").modal("hide");

		return false;
	})

	$("#generate").click(function(e){
		e.preventDefault();

		$("#generate").attr("disabled", true);

		log("Generating . . .");

		/*

		icon_tracker[current_id] = {
			name : $("#modal-name").val(),
			application_dir : $("#modal-app-dir").val(),
			icon_dir : $("#modal-icon0-span").val()
		}

		*/

		var button_size_i = parseInt($("#button-size").val());

		if (isNaN(button_size_i)){
			button_size_i = 512;
		}

		var icon_padding_i = parseInt($("#button-icon-padding-size").val());

		if (isNaN(icon_padding_i)){
			icon_padding_i = 10;
		}

		var CONFIG = {
			icon_size : button_size_i - (icon_padding_i * 2),
			button_size : button_size_i,
		}

		for (let id in icon_tracker){
			generateSilmeriaIcons(icon_tracker[id].icon_dir, icon_tracker[id].name, CONFIG)
		}

		var space_icons = $("#button-spacing").val();
		var alpha = $("#initial-transparency").val();
		var line_color = $("#line-color").val();
		var line_thickness = $("#line-thickness").val();
		var line_button_spacing = $("#line-button-spacing").val();
		var background_color = $("#background-color").val();


		if ($("#overwrite-existing-ini").val()){

			var str_buffer_s = `TotalIcons=${Object.keys(icon_tracker).length}\nSpaceIcons=${space_icons}\nAlpha=${alpha}\nLineColor=${line_color}\nLineThickness=${line_thickness}\nSpaceLineIcons=${line_button_spacing}\nBackgroundColor=${background_color}`;
			var str_buffer_i = ``

			let noted_index = 1;

			for (var index in icon_tracker){

				str_buffer_s += `;Icon${noted_index}\n`
				str_buffer_s += `Icon${noted_index}=#@#Icons/Generated/${icon_tracker[index].name}.png\n`
				str_buffer_s += `Icon${noted_index}Over=#@#Icons/Generated/${icon_tracker[index].name}_Active.png\n`
				str_buffer_s += `Icon${noted_index}Action=[\"${icon_tracker[index].application_dir}\"]\n\n`

				str_buffer_i += `[MeterIcon${noted_index}]\nMeter=Image\nW=#IconSize#\nH=#IconSize#\nImageName=#Icon${noted_index}#\nImageAlpha=#Alpha#\nMouseOverAction=[!SetOption #CURRENTSECTION# ImageName "#Icon${noted_index}Over#"][!UpdateMeter "#CURRENTSECTION#"][!Redraw]\nMouseLeaveAction=[!SetOption #CURRENTSECTION# ImageName "#Icon${noted_index}#"][!UpdateMeter "#CURRENTSECTION#"][!Redraw]\nLeftMouseUpAction=#Icon${noted_index}Action#\nAntialias=1\nDynamicVariables=1\n\n`

				noted_index++;
			}

			fs.writeFile(path.join(OUTPUT_DIR, "Settings.ini"), str_buffer_s, function(ini_e){

				if (ini_e){
					return log("❌ Failed to write generated Settings.ini config to file", "\nError:", ini_e);
				}

				log("Successfully wrote generated Settings.ini config to file.");
			})

			fs.writeFile(path.join(OUTPUT_DIR, "Icons.ini"), str_buffer_i, function(ini_e){

				if (ini_e){
					return log("❌ Failed to write generated Icons.ini config to file", "\nError:", ini_e);
				}

				log("Successfully wrote generated Icons.ini config to file.");
			})

		}
		
		$("#generate").removeAttr("disabled");

		return false;
	})

	$("#open-output-dir").click(function(e){
		e.preventDefault();
		ipcRenderer.send("open-output-dir");
		return false;
	})

	$("#open-silmeria-dir").click(function(e){
		e.preventDefault();
		ipcRenderer.send("open-silmeria-dir");
		return false;
	})


})


function makeid(length) {
	var result           = '';
	var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for ( var i = 0; i < length; i++ ) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

//


function generateSilmeriaIcons(img_path_full, img_name, CONFIG){

	log("\nGENERATING SILMERIA BUTTONS FOR", img_name);

	if (!fs.existsSync(path.join(OUTPUT_DIR, "/Icons/Generated"))) {
		fs.mkdirSync(path.join(OUTPUT_DIR, "/Icons/Generated"))
	}

	AVERAGER(img_path_full, function(avg_e, average_bkg_color_rgb){

		if (avg_e){
			return log("❌ Failed to get dominant color for file", img_path_full, "\nAverager Error:", avg_e);
		}

		var average_bkg_color = rgbArrayToHex(average_bkg_color_rgb);

		console.log("avg_bkg_color", average_bkg_color);

		JIMP.read(img_path_full, function(read_e, img){

			if (read_e){
				return log("❌ Failed to read file", img_path_full, "\nRead Error:", read_e);
			}

			var icon_proper = img.scaleToFit(CONFIG.icon_size, CONFIG.icon_size);
			var icon_white = icon_proper.clone().brightness(1);

			var composite_center_pos = {
				x : Math.floor((CONFIG.button_size - icon_proper.bitmap.width) / 2),
				y : Math.floor((CONFIG.button_size - icon_proper.bitmap.height) / 2)
			}


			console.log("TYPE", typeof icon_proper);

			// BASE BUTTON
			new JIMP(CONFIG.button_size, CONFIG.button_size, average_bkg_color, function(err, img_main){

				var file_output_path = path.join(OUTPUT_DIR, "Icons/Generated/" + img_name + ".png")

				img_main.composite(icon_white, composite_center_pos.x, composite_center_pos.y).write(file_output_path, function(write_e){

					if (write_e){
						return log("❌ Failed to write file", file_output_path, "\nWrite Error:", write_e);
					}

					log("✔️ Successfully created base button for", img_name);

				});
			})

			// HOVERED BUTTON
			new JIMP(CONFIG.button_size, CONFIG.button_size, "#fff", function(err, img_hovered){

				var file_output_path = path.join(OUTPUT_DIR, "Icons/Generated/" + img_name + "_Active.png")

				img_hovered.composite(icon_proper, composite_center_pos.x, composite_center_pos.y).write(file_output_path, function(write_e){

					if (write_e){
						return log("❌ Failed to write file", file_output_path, "\nWrite Error:", write_e);
					}

					log("✔️ Successfully created hover active button for", img_name);

				});
			})

		})

	})

}

// HELPER METHODS

function rgbArrayToHex(rgbArray){

	function localNumberToHex(num){
		var hex = Number(num).toString(16);
		if (hex.length < 2){
			hex = "0" + hex;
		}
		return hex;
	}

	return "#" + localNumberToHex(rgbArray[0]) + localNumberToHex(rgbArray[1]) + localNumberToHex(rgbArray[2]);

}