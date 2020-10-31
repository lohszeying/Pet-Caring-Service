function basic(req, res, page, other) {
	var info = {
		page: page,
		user: req.user.username,
		name: req.user.name,
		area: req.user.area,
		enabled   : req.user.enabled,
	};
	if(other) {
		for(var fld in other) {
			info[fld] = other[fld];
		}
	}
	res.render(page, info);
}
function query(req, fld) {
	return req.query[fld] ? req.query[fld] : '';
}
function msg(req, fld, pass, fail) {
	var info = query(req, fld);
	return info ? (info=='pass' ? pass : fail) : '';
}

function msg2(req, fld, messages) {
	var info = query(req,fld);
	return info && (info in messages) ? (messages[info]) : '';
}


module.exports = {basic: basic,
                query: query,
				msg: msg,
				msg2: msg2};
