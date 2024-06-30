
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

// item classes that will be parsed
const includes = ["all", "axes", "clubs", "ranged", "swords", "whips"];

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
	async fetchText(path, callback, branch="master", mime="text/plain") {
		const url = repoPrefix + branch + "/" + path;
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
		await this.fetchText("build.ant.properties", parser.getVersion);
	},

	/**
	 * Fetches & loads configured items classes.
	 */
	async fetchClasses() {
		await this.fetchText("data/conf/items.xml", parser.getClasses); //, "master", "application/xml");
	},

	/**
	 * Fetches & loads items info for selected class.
	 */
	async fetchItemsForClass() {
		if (typeof(main.className) !== "string" || main.className.length === 0) {
			logger.error("No class selected");
			return;
		}

		if (main.className !== "all") {
			await remote.fetchText("data/conf/items/" + main.className + ".xml", (content) => {
				parser.getItems(content);
			});
			return;
		}

		const select = document.getElementById("classes");
		const options = select.options;
		// skip first index since "all" is not an actual item class
		for (let idx = 1; idx < options.length; idx++) {
			await remote.fetchText("data/conf/items/" + options[idx].value + ".xml", (content) => {
				parser.getItems(content);
			});
		}
	}
};

/**
 * Main properties & functions.
 */
const main = {
	/** Parsed Stendhal version. */
	version: [],
	/** Item class. */
	className: "all",
	/** Attribute by which to sort. */
	sortBy: "name",
	/** Sorting order. */
	descending: false,
	/** Items data. */
	items: [],

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

	// FIXME:
	//   - need to exclude unavailable items
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

		for (const properties of items) {
			const link = "https://stendhalgame.org/item/" + properties["class"] + "/" + properties["name"].replaceAll(" ", "_") + ".html";
			const classList = ["cell"];
			if (this.odd) {
				classList.push("odd-cell");
			}
			for (const prop in properties) {
				let value = properties[prop];
				if (prop === "image") {
					const src = repoPrefix + "master/data/sprites/items/" + properties["class"] + "/" + value + ".png";
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
		const prevSelected = this.className;
		const select = document.getElementById("classes");
		for (let idx = 0; idx < select.options.length; idx++) {
			if (select.options[idx].value === name) {
				this.className = name;
				select.selectedIndex = idx;
				break;
			}
		}
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
	getVersion(content) {
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
	},

	/**
	 * Parses item classes from fetched data.
	 *
	 * @param {string} content
	 *   Items XML config data.
	 */
	getClasses(content) {
		content = util.normalize(content);

		const classNames = [];
		for (let li of content.split("\n")) {
			li = li.replace(/^\t/, "");
			if (li.startsWith("<group uri=\"items/")) {
				const className = li.replace(/<group uri="items\//, "").replace(/\.xml.*$/, "");
				if (includes.indexOf(className) > -1) {
					classNames.push(className);
				}
			}
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
		if (includes.indexOf(className) < 0) {
			if (typeof(className) === "string") {
				logger.error("Unknown item class: " + className);
			}
			// default to show all items
			className = "all";
		}
		main.selectClass(className);
	},

	/**
	 * Parses & loads items info from fetched content.
	 *
	 * @param {string} content
	 *   Fetched items XML data.
	 */
	getItems(content) {
		const xml = new DOMParser().parseFromString(content, "text/xml");
		const items = xml.getElementsByTagName("item");
		for (let idx = 0; idx < items.length; idx++) {
			const itemData = items[idx];
			const typeInfo = itemData.getElementsByTagName("type")[0];
			const attributes = itemData.getElementsByTagName("attributes")[0];
			const item = {
				name: itemData.getAttribute("name"),
				class: typeInfo.getAttribute("class"),
				image: typeInfo.getAttribute("subclass"),
				level: this.numberAttribute(attributes, "min_level"),
				rate: this.numberAttribute(attributes, "rate"),
				atk: this.numberAttribute(attributes, "atk"),
				special: []
			};
			item.dpt = Math.round((item.atk / item.rate) * 100) / 100;
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
			const lifesteal = this.numberAttribute(attributes, "lifesteal");
			if (lifesteal !== 0) {
				item.special.push("lifesteal=" + lifesteal);
			}
			const def = this.numberAttribute(attributes, "def");
			if (def !== 0) {
				item.special.push("def=" + def);
			}
			const range = this.numberAttribute(attributes, "range");
			if (range !== 0) {
				item.special.push("range=" + range);
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
		const params = new URLSearchParams("class=" + className);
		params.set("sort", ""+main.sortBy);
		params.set("descending", ""+main.descending);
		main.reload(params.toString());
	});

	for (const col of ["name", "class", "level", "rate", "atk", "dpt", "special"]) {
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
	populate();
});
