const STORAGE_KEY = 'storage_box_organizer_data';
const IDB_NAME = 'storage_box_organizer_db';
const IDB_STORE = 'images';

function openIdb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(IDB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(IDB_STORE)) {
				db.createObjectStore(IDB_STORE, { keyPath: 'id' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function idbPutImage(id, blob) {
	return openIdb().then(db => new Promise((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readwrite');
		const store = tx.objectStore(IDB_STORE);
		store.put({ id, blob });
		tx.oncomplete = () => resolve(id);
		tx.onerror = () => reject(tx.error || new Error('IDB put failed'));
	}));
}

function idbGetImage(id) {
	return openIdb().then(db => new Promise((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readonly');
		const store = tx.objectStore(IDB_STORE);
		const req = store.get(id);
		req.onsuccess = () => resolve(req.result ? req.result.blob : null);
		req.onerror = () => reject(req.error);
	}));
}

function idbDeleteImage(id) {
	return openIdb().then(db => new Promise((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readwrite');
		const store = tx.objectStore(IDB_STORE);
		store.delete(id);
		tx.oncomplete = () => resolve(true);
		tx.onerror = () => reject(tx.error || new Error('IDB delete failed'));
	}));
}

function dataURLToBlob(dataURL) {
	const parts = dataURL.split(',');
	const match = parts[0].match(/:(.*?);/);
	const mime = match ? match[1] : 'application/octet-stream';
	const bstr = atob(parts[1] || '');
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) u8arr[n] = bstr.charCodeAt(n);
	return new Blob([u8arr], { type: mime });
}

function blobToDataURL(blob) {
	return new Promise((resolve, reject) => {
		if (!blob) return resolve(null);
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

async function saveImageToIdbIfNeeded(item) {
	if (!item) return item;
	const imageVal = item.image;
	if (!imageVal) return item;

	let blob = null;
	if (typeof imageVal === 'string' && imageVal.startsWith('data:')) {
		blob = dataURLToBlob(imageVal);
	} else if (imageVal instanceof Blob || (typeof File !== 'undefined' && imageVal instanceof File)) {
		blob = imageVal;
	} else {
		// unknown type — leave unchanged
		return item;
	}

	const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
	await idbPutImage(id, blob);
	const copy = { ...item };
	copy.image = '';
	copy.imageId = id;
	return copy;
}

async function restoreImagesInData(data) {
	const lists = [];
	if (Array.isArray(data.items)) lists.push(...data.items);
	if (Array.isArray(data.boxes)) lists.push(...data.boxes);

	await Promise.all(lists.map(async (entry) => {
		if (entry && entry.imageId) {
			try {
				const blob = await idbGetImage(entry.imageId);
				if (blob) {
					const dataUrl = await blobToDataURL(blob);
					entry.image = dataUrl;
				}
			} catch (e) {
				console.warn('storage: failed to restore image from IDB', e);
			}
		}
	}));
	return data;
}

async function saveData(data) {
	// Preprocess: offload File/Blob or dataURL images into IDB, replace with imageId
	const copy = {
		items: Array.isArray(data.items) ? data.items.slice() : [],
		boxes: Array.isArray(data.boxes) ? data.boxes.slice() : []
	};

	for (let i = 0; i < copy.items.length; i++) {
		copy.items[i] = await saveImageToIdbIfNeeded(copy.items[i]);
	}
	for (let i = 0; i < copy.boxes.length; i++) {
		copy.boxes[i] = await saveImageToIdbIfNeeded(copy.boxes[i]);
	}

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
		return;
	} catch (err) {
		console.error('storage.saveData: failed to save to localStorage', err);
		throw err;
	}
}

async function loadData() {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return { items: [], boxes: [] };
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch (e) {
		console.error('storage.loadData: failed to parse localStorage data', e);
		return { items: [], boxes: [] };
	}
	await restoreImagesInData(parsed);
	return parsed;
}

async function addItem(item) {
	const data = await loadData();
	data.items = data.items || [];
	data.items.push(item);
	await saveData(data);
}

async function addBox(box) {
	const data = await loadData();
	data.boxes = data.boxes || [];
	data.boxes.push(box);
	await saveData(data);
}

async function deleteItem(id) {
	const data = await loadData();
	if (!data.items) return;
	const idx = data.items.findIndex(i => i.id === id);
	if (idx === -1) return;
	const imageId = data.items[idx].imageId || null;
	data.items.splice(idx, 1);
	await saveData(data);
	if (imageId) {
		try { await idbDeleteImage(imageId); } catch (e) { console.warn('storage: failed to delete image blob', e); }
	}
}

async function deleteBox(id) {
	const data = await loadData();
	if (!data.boxes) return;
	const idx = data.boxes.findIndex(b => b.id === id);
	if (idx === -1) return;
	const imageId = data.boxes[idx].imageId || null;
	data.boxes.splice(idx, 1);
	await saveData(data);
	if (imageId) {
		try { await idbDeleteImage(imageId); } catch (e) { console.warn('storage: failed to delete image blob', e); }
	}
}

async function saveAll(data) {
	await saveData(data);
}

async function getAll() {
	return await loadData();
}

// export API (adjust to your project's module system)
export default {
	saveAll,
	getAll,
	addItem,
	addBox,
	deleteItem,
	deleteBox,
	idbGetImage,
	idbPutImage,
	idbDeleteImage
};
