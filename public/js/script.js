const install = document.getElementById('install');
const gistinfo = document.getElementById('gistinfo');
if( install && gistinfo ) {
	install.addEventListener('click', _ => {
		chrome.runtime.sendMessage(runtimeid, {gistInformation: {
			id: gistinfo.gistid.value,
			name: gistinfo.gistname.value,
			matches: gistinfo.gistmatches.value
		}}, res => {
			markInstalled();
		});
	});
}
function markInstalled() {
	install.classList.remove('btn-primary');
	install.classList.add('btn-success');
	install.disabled = true;
	install.textContent = 'Installed!';
}
function runtimeLoaded() {
	if( !install || !gistinfo ) return;
	chrome.runtime.sendMessage(runtimeid, {checkInstalled: gistinfo.gistid.value}, res => {
		if( res.installed ) markInstalled();
	});
}