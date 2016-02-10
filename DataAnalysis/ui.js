function OutputSpace(id) {
	this.container = document.getElementById(id);
	
	// don't think we actually will need this now I think of it
	this.getContents = function() {
		return this.container.innerHTML;
	}
	
	this.addMessage = function(message) {
		var p = document.createElement('p');
		p.setAttribute('class', 'message');
		var txt = document.createTextNode(message);
		p.appendChild(txt);
		this.addNode(p);
		return p;
	}
	
	this.addMessages = function(messages) {
		for (i in messages) {
			this.addMessage(messages[i]);
		}
	}
	
	this.addNode = function(node) {
		if (this.container.hasChildNodes() ) {
			this.container.insertBefore(node, this.container.childNodes[0]);
		}
		else {
			this.container.appendChild(node);
		}
		return node;
	}
	
	this.replaceNode = function(oldSelector, newMarkup, addIfMissing) {
		oldNode = this.container.querySelector(oldSelector);
		newNode = (new DOMParser())
			.parseFromString(newMarkup, 'application/xml')
			.documentElement; //TODO: error check this (ideally!)
		
		if (oldNode) {
			this.container.replaceChild(newNode, oldNode);
		}
		else if(addIfMissing) {
			this.addNode(newNode);
		}
	}
	
	this.addNodes = function(nodeList) {
		for (i = 0; i < nodeList.length ; i++) {
			this.addNode(nodeList[i]);
		}
	}
	
	this.addMarkup = function(markup) {
		dom = (new DOMParser()).parseFromString(markup, 'application/xml'); //TODO: error check this (ideally!)
		this.addNodes(dom.childNodes); // .reverse() ??
	}
}

