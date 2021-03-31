
export function setupFullscreenControl(query: string){
	const fullscreenButton = document.querySelector(query) as HTMLElement;
	if (!fullscreenButton) return;
	document.addEventListener("fullscreenchange", () => {
		const isFullScreen = document.fullscreenElement !== null;
		fullscreenButton.style.display = isFullScreen ? "none" : "initial";
	});
	fullscreenButton.addEventListener("click", () => {
		document.documentElement.requestFullscreen();
	});
}