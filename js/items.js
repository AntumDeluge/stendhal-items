
/* MIT License
 *
 * Copyright © 2024 Jordan Irwin <antumdeluge@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * 	The above copyright notice and this permission notice shall be included in
 * 	all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Stendhal's repo URL
const repoPrefix = "https://raw.githubusercontent.com/arianne/stendhal/";

/**
 * Items classes.
 */
const classes = {
	/** Items grouping. */
	groups: {
		weapons: ["axes", "clubs", "ranged", "swords", "whips"],
		protective: ["armors", "boots", "cloaks", "helmets", "legs", "shields"],
		projectiles: ["arrows", "missiles"]
	},
	/** Available class names parsed from config. */
	available: [],
	/** Item classes to ignore. */
	excludes: ["dummy_weapons"],

	/**
	 * Retrieves selectable items groups names.
	 *
	 * @returns {string[]}
	 *   Items groups.
	 */
	getGroupNames() {
		return Object.keys(this.groups);
	},

	/**
	 * Checks if class is a weapon equipment type.
	 *
	 * @param {string} className
	 *   Class or group name.
	 * @returns {boolean}
	 *   `true` if is a weapon type.
	 */
	isWeaponType(className) {
		return className === "weapons" || this.groups.weapons.indexOf(className) > -1;
	},

	/**
	 * Checks if class is an armor equipment type.
	 *
	 * @param {string} className
	 *   Class or group name.
	 * @returns {boolean}
	 *   `true` if is a armor type.
	 */
	isArmorType(className) {
		return className === "protective" || this.groups.protective.indexOf(className) > -1;
	},

	/**
	 * Checks if class is a ranged weapon type.
	 *
	 * @param {string} className
	 *   Class or group name.
	 * @returns {boolean}
	 *   `true` if is a ranged type.
	 */
	isRangedType(className) {
		return className === "ranged";
	},

	/**
	 * Checks if class is a throwable projectile type.
	 *
	 * @param {string} className
	 *   Class or group name.
	 * @returns {boolean}
	 *   `true` if is a projectile type.
	 */
	isProjectileType(className) {
		return className === "projectiles" || this.groups.projectiles.indexOf(className) > -1;
	}
};

/**
 * Object for displaying messages.
 */
const logger = {
	/** Element to display message in browser window. */
	container: document.getElementById("messages"),

	/**
	 * Adds a line of text to displayed message in browser window.
	 *
	 * @param {string} msg
	 *   Message text.
	 * @param {string} [color=""]
	 *   Text color.
	 */
	display(msg, color="") {
		const p = document.createElement("p");
		p.style.color = color;
		p.innerText = msg;
		this.container.appendChild(p);
	},

	/**
	 * Logs a message at error level.
	 *
	 * @param {object|string} err
	 *   Message text.
	 * @param {boolean} [display=true]
	 *   If `true`, add line to messages displayed in browser.
	 */
	error(err, display=true) {
		let msg = err;
		if (typeof(err) === "object") {
			msg = err.message;
		}
		console.error(err);
		if (display) {
			this.display("ERROR: " + msg, "red");
		}
	},

	/**
	 * Logs a message at warning level.
	 *
	 * @param {string} msg
	 *   Message text.
	 * @param {boolean} [display=false]
	 *   If `true`, add line to messages displayed in browser.
	 * @param {boolean} [traceback=false]
	 *   If `true`, display traceback in console.
	 */
	warn(msg, display=false, traceback=false) {
		if (traceback) {
			console.warn(msg + "\n", new Error());
		} else {
			console.warn(msg);
		}
		if (display) {
			this.display("WARNING: " + msg, "orange");
		}
	},

	/**
	 * Logs a message at info level.
	 *
	 * @param {string} msg
	 *   Message text.
	 * @param {boolean} [display=false]
	 *   If `true`, add line to messages displayed in browser.
	 */
	info(msg, display=false) {
		console.log(msg);
		if (display) {
			this.display("INFO: " + msg);
		}
	},

	/**
	 * Logs a message at debug level.
	 *
	 * @param {string} msg
	 *   Message text.
	 * @param {boolean} [display=false]
	 *   If `true`, add line to messages displayed in browser.
	 */
	debug(msg, display=false) {
		console.debug(msg);
		if (display) {
			this.display("DEBUG: " + msg, "green");
		}
	}
};

/**
 * Helper utility function.
 */
const util = {
	/**
	 * Converts a value to number.
	 *
	 * @param {string} value
	 *   String value.
	 * @param {number} def
	 *   Default value if number cannot be parsed.
	 * @returns {number}
	 *   Parsed number value.
	 */
	parseNumberDefault(value, def) {
		const res = Number.parseFloat(value);
		if (Number.isNaN(res) || !Number.isFinite(res)) {
			return def;
		}
		return res;
	},

	/**
	 * Ensures LF line endings in content.
	 *
	 * @param {string} content
	 *   Fetched text content.
	 * @returns {string}
	 *   Normalized text content.
	 */
	normalize(content) {
		return content.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
	}
};

/**
 * Object to manage remote resources.
 */
const remote = {
	/**
	 * Fetches contents of a file from Stendhal Git repo.
	 *
	 * @param {string} path
	 *   Path to file relative to repo root.
	 * @param {Function} callback
	 *   Function called when data is ready.
	 * @param {string} [branch="master"]
	 *   Branch on which desired version is located.
	 * @param {string} [mime="text/plain"]
	 *   Target file MIME type.
	 */
	async fetchText(path, callback, mime="text/plain") {
		const url = repoPrefix + main.branch + "/" + path;
		try {
			const res = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": mime
				}
			});
			const text = await res.text();
			callback(text);
		} catch (e) {
			logger.error(e);
		}
	},

	/**
	 * Fetches & loads current release version from properties file.
	 */
	async fetchVersion() {
		await this.fetchText("build.ant.properties", (content) => {
			parser.parseVersion(content);
		});
	},

	/**
	 * Fetches & loads configured items classes.
	 */
	async fetchClasses() {
		await this.fetchText("data/conf/items.xml", (content) => {
			parser.parseClasses(content);
		});
	},

	/**
	 * Fetches & loads items info for selected class.
	 */
	async fetchItemsForClass() {
		if (typeof(main.className) !== "string" || main.className.length === 0) {
			logger.error("No class selected");
			return;
		}

		if (classes.getGroupNames().indexOf(main.className) > -1) {
			for (const className of classes.groups[main.className]) {
				await remote.fetchText("data/conf/items/" + className + ".xml", (content) => {
					parser.parseItems(content);
				});
			}
			return;
		}

		await remote.fetchText("data/conf/items/" + main.className + ".xml", (content) => {
			parser.parseItems(content);
		});
	}
};

/**
 * Main properties & functions.
 */
const main = {
	/** Parsed Stendhal version. */
	version: [],
	/** Branch URL slug. */
	branch: "master",
	/** Item class. */
	className: "weapons",
	/** Attribute by which to sort. */
	sortBy: "name",
	/** Sorting order. */
	descending: false,
	/** Loaded items data. */
	items: [],

	/** Property determining if unattainable items are visible. */
	showUnattainable: false,
	/** Property for alternating row background color. */
	odd: false,

	/**
	 * Reloads page with query parameters.
	 *
	 * @param {string|undefined} query
	 *   Query parameters.
	 */
	reload(query=undefined) {
		let target = window.location.href;
		if (query) {
			target = target.split("?")[0] + "?" + query;
		}
		window.location.href = target;
	},

	/**
	 * Sets branch URL slug.
	 */
	updateBranch() {
		if (this.version.length > 0) {
			this.branch = "VERSION_" + ("0"+this.version[0]).slice(-2) + "_RELEASE_" + this.version[1];
		}
	},

	/**
	 * Updates visible columns for class type.
	 */
	updateColumns() {
		const weaponAttr = ["level", "rate", "atk", "dpt"];
		const armorAttr = ["level", "def"];
		const projAttr = ["level", "atk", "range"];
		for (const attr of ["value", ...weaponAttr, ...armorAttr, ...projAttr]) {
			document.getElementById(attr).classList.add("hidden");
		}
		if (classes.isWeaponType(this.className)) {
			for (const attr of weaponAttr) {
				document.getElementById(attr).classList.remove("hidden");
			}
			if (classes.isRangedType(this.className)) {
				document.getElementById("range").classList.remove("hidden");
			}
		} else if (classes.isArmorType(this.className)) {
			for (const attr of armorAttr) {
				document.getElementById(attr).classList.remove("hidden");
			}
		} else if (classes.isProjectileType(this.className)) {
			for (const attr of projAttr) {
				document.getElementById(attr).classList.remove("hidden");
			}
		} else if (this.className === "money") {
			document.getElementById("value").classList.remove("hidden");
		}
	},

	/**
	 * Retrieves an item definition & removes it from item list.
	 *
	 * @param {string} name
	 *   Item name.
	 * @returns {object|undefined}
	 *   Item definition or `undefined`.
	 */
	pop(name) {
		const res = {idx: -1, item: undefined};
		for (let idx = 0; idx < this.items.length; idx++) {
			const item = this.items[idx];
			if (item.name === name) {
				res.idx = idx;
				res.item = item;
				break;
			}
		}
		if (res.idx > -1) {
			this.items.splice(res.idx, 1);
		}
		return res.item;
	},

	/**
	 * Retrieves sorted item list.
	 *
	 * @returns {object[]}
	 *   Parsed items.
	 */
	getSorted() {
		const items = [...this.items];
		items.sort((objA, objB) => {
			const valueA = objA[this.sortBy];
			const valueB = objB[this.sortBy];
			if (valueA < valueB) {
				return this.descending ? 1 : -1;
			}
			if (valueA > valueB) {
				return this.descending ? -1 : 1;
			}
			return 0;
		});
		return items;
	},

	/**
	 * Displays loaded items data.
	 */
	displayItems() {
		const items = this.getSorted();

		for (const item of items) {
			let name = item["name"];
			if (name === "l/r hand swords") {
				name = "l hand sword";
			}
			const link = "https://stendhalgame.org/item/" + item["class"] + "/" + name.replaceAll(" ", "_") + ".html";
			const classList = ["cell"];
			if (this.odd) {
				classList.push("odd-cell");
			}
			for (const prop in item) {
				let value = item[prop];
				if (prop === "image") {
					const src = repoPrefix + this.branch + "/data/sprites/items/" + item["class"] + "/" + value + ".png";
					const image = new Image();
					image.src = src;

					// container element to restrict image dimensions
					const container = document.createElement("div");
					container.classList.add("icon-container");
					container.appendChild(image);

					element = document.createElement("div");
					element.classList.add(...classList, "left-cell");
					element.appendChild(container);
					document.getElementById("image").appendChild(element);
					continue;
				}
				if (Array.isArray(value)) {
					value = value.join(", ");
				} else {
					value = "" + value;
				}
				element = document.createElement("div");
				element.classList.add(...classList);
				if (prop === "special") {
					element.classList.add("right-cell");
				} else if (prop === "name") {
					value = "<a href=\"" + link + "\" target=\"_blank\">" + value + "</a>";
				}
				if (value.length === 0) {
					element.innerHTML = "&nbsp;";
				} else {
					element.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;" + value;
				}
				document.getElementById(prop).appendChild(element);
			}
			this.odd = !this.odd;
		}
	},

	/**
	 * Sets selected item class.
	 *
	 * @param {string} name
	 *   Class name.
	 */
	selectClass(name) {
		const select = document.getElementById("classes");
		for (let idx = 0; idx < select.options.length; idx++) {
			if (select.options[idx].value === name) {
				this.className = name;
				select.selectedIndex = idx;
				break;
			}
		}
		this.updateColumns();
	}
};

/**
 * Utility object for type conversion/parsing.
 */
const parser = {
	/**
	 * Parses number value from item attributes list.
	 *
	 * @param {XMLDocument} attributes
	 *   Item attributes.
	 * @param {string} name
	 *   Attribute name.
	 * @param {number} [def=0]
	 * @returns {number}
	 *   Parsed number value.
	 */
	numberAttribute(attributes, name, def=0) {
		const element = attributes.getElementsByTagName(name)[0];
		if (!element) {
			return def;
		}
		const value = element.getAttribute("value");
		return util.parseNumberDefault(value, def);
	},

	/**
	 * Parses string value from item attributes list.
	 *
	 * @param {XMLDocument} attributes
	 *   Item attributes.
	 * @param {string} name
	 *   Attribute name.
	 * @return {string|undefined}
	 *   Parsed string value or `undefined`.
	 */
	stringAttribute(attributes, name) {
		const element = attributes.getElementsByTagName(name)[0];
		if (!element) {
			return undefined;
		}
		return element.getAttribute("value");
	},

	/**
	 * Parses version from fetched properties file.
	 *
	 * @param {string} content
	 *   Properties file text contents.
	 */
	parseVersion(content) {
		content = util.normalize(content);
		for (const li of content.split("\n")) {
			if (li.startsWith("version\.old")) {
				for (const v of li.split("=")[1].trim().split(".")) {
					main.version.push(Number.parseInt(v, 10));
				}
				break;
			}
		}
		if (main.version.length > 0) {
			let versionString = "";
			for (const v of main.version) {
				if (versionString.length > 0) {
					versionString += ".";
				}
				versionString += v;
			}
			document.getElementById("title").innerText = "Stendhal " + versionString + " Items";
		}
		main.updateBranch();
	},

	/**
	 * Parses item classes from fetched data.
	 *
	 * @param {string} content
	 *   Items XML config data.
	 */
	parseClasses(content) {
		content = util.normalize(content);

		for (let li of content.split("\n")) {
			li = li.replace(/^\t/, "");
			if (li.startsWith("<group uri=\"items/")) {
				const className = li.replace(/<group uri="items\//, "").replace(/\.xml.*$/, "");
				if (classes.excludes.indexOf(className) > -1) {
					continue;
				}
				classes.available.push(className);
			}
		}

		const classNames = classes.getGroupNames();
		for (const className of classes.available) {
			classNames.push(className);
		}

		const select = document.getElementById("classes");
		for (const className of classNames) {
			const opt = document.createElement("option");
			opt.value = className
			opt.innerText = className;
			select.appendChild(opt);
		}

		const params = new URLSearchParams(window.location.search);
		let className = params.get("class");
		if (classNames.indexOf(className) < 0) {
			if (typeof(className) === "string") {
				logger.error("Unknown item class: " + className);
			}
			// default to show weapons
			className = "weapons";
		}
		main.selectClass(className);
	},

	/**
	 * Parses & loads items info from fetched content.
	 *
	 * @param {string} content
	 *   Fetched items XML data.
	 */
	parseItems(content) {
		const xml = new DOMParser().parseFromString(content, "text/xml");
		const items = xml.getElementsByTagName("item");
		for (let idx = 0; idx < items.length; idx++) {
			const itemData = items[idx];
			const typeInfo = itemData.getElementsByTagName("type")[0];
			const valueInfo = itemData.getElementsByTagName("value")[0];
			const attributes = itemData.getElementsByTagName("attributes")[0];
			let item = {
				name: itemData.getAttribute("name"),
				class: typeInfo.getAttribute("class"),
				image: typeInfo.getAttribute("subclass"),
				value: valueInfo ? valueInfo.getAttribute("value") : "0",
				level: this.numberAttribute(attributes, "min_level"),
				rate: this.numberAttribute(attributes, "rate"),
				atk: this.numberAttribute(attributes, "atk"),
				def: this.numberAttribute(attributes, "def"),
				range: this.numberAttribute(attributes, "range")
			};

			let lrSword;
			if (item.name === "l hand sword") {
				lrSword = main.pop("r hand sword");
			} else if (item.name === "r hand sword") {
				lrSword = main.pop("l hand sword");
			}
			if (lrSword) {
				// update name since both detected
				lrSword.name = "l/r hand swords";
				// atk & def are combined when used together
				lrSword.atk += item.atk;
				lrSword.def += item.def;
				item = lrSword;
			}

			item.dpt = Math.round((item.atk / item.rate) * 100) / 100;
			item.special = [];
			const nature = this.stringAttribute(attributes, "damagetype");
			if (typeof(nature) !== "undefined") {
				item.special.push(nature);
			}
			const statusAttack = this.stringAttribute(attributes, "statusattack");
			if (typeof(statusAttack) !== "undefined") {
				if (statusAttack.includes("poison") || statusAttack.includes("venom")) {
					item.special.push("poison");
				} else if (statusAttack.includes(",")) {
					item.special.push(statusAttack.split(",")[1]);
				} else {
					item.special.push(statusAttack);
				}
			}
			for (const sus of itemData.getElementsByTagName("susceptibility")) {
				let value = Math.round(util.parseNumberDefault(sus.getAttribute("value"), 1) * 1000) / 10;
				if (value !== 100) {
					// susceptibilities are inverse
					value = 100 - value;
					item.special.push(sus.getAttribute("type") + " (" + (value > 0 ? "+" : "") + value + "%)");
				}
			}
			const lifesteal = this.numberAttribute(attributes, "lifesteal") * 100;
			if (lifesteal !== 0) {
				item.special.push("lifesteal (" + (lifesteal > 0 ? "+" : "") + lifesteal + "%)");
			}
			if (!classes.isWeaponType(main.className) && !classes.isProjectileType(main.className)
					&& item.atk !== 0) {
				item.special.push("atk=" + item.atk);
			}
			if (!classes.isArmorType(main.className) && item.def !== 0) {
				item.special.push("def (" + item.def + ")");
			}
			if (!classes.isRangedType(main.className) && !classes.isProjectileType(main.className)
					&& item.range !== 0) {
				item.special.push("range (" + item.range + ")");
			}
			const consumeAmount = this.numberAttribute(attributes, "amount");
			if (consumeAmount !== 0) {
				const cures = this.stringAttribute(attributes, "immunization");
				if (cures) {
					item.special.push("cure (" + cures + ")");
					item.special.push("immunity duration (" + consumeAmount + ")");
				} else {
					const regenType = consumeAmount > 0 ? "heal" : "hurt";
					const regen = this.numberAttribute(attributes, "regen");
					const frequency = this.numberAttribute(attributes, "frequency");
					item.special.push(regenType + " (" + consumeAmount + ")");
					if (frequency !== 1 || regen !== consumeAmount) {
						item.special.push("regen (" + regen + ")");
						item.special.push("frequency (" + frequency + ")");
					}
				}
			}

			const unattainable = itemData.getElementsByTagName("unattainable").length > 0;
			if (unattainable) {
				logger.debug("Unattainable: " + item.name);
				if (!main.showUnattainable) {
					// don't add to list
					continue;
				}
			}

			main.items.push(item);
		}
	}
};

/**
 * Executes methods to populate item list.
 */
async function populate() {
	await remote.fetchVersion();
	await remote.fetchClasses();
	await remote.fetchItemsForClass();
	main.displayItems();
}

// entry point
document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("classes").addEventListener("change", (evt) => {
		const select = evt.target;
		const className = select.options[select.selectedIndex].value;
		// reload page to update for changes
		const params = new URLSearchParams(window.location.search);
		params.set("class", className);
		main.reload(params.toString());
	});

	for (const col of ["name", "class", "level", "rate", "atk", "dpt", "def", "special"]) {
		const header = document.getElementById(col).firstElementChild;
		header.classList.add("sortable");
		header.addEventListener("click", (evt) => {
			const sortBy = evt.currentTarget.parentElement.id;
			const params = new URLSearchParams(window.location.search);
			if (sortBy) {
				params.set("sort", sortBy);
			}
			let descending = false;
			if (sortBy === main.sortBy) {
				descending = !main.descending;
			}
			params.set("descending", ""+descending);
			main.reload(params.toString());
		});
	}

	const params = new URLSearchParams(window.location.search);
	main.sortBy = params.get("sort") || main.sortBy;
	main.descending = params.get("descending") === "true";
	main.showUnattainable = params.get("unattainable") === "true";
	populate();
});
