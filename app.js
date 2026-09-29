const KEY="audit_center_data_v1";
const roomKey="audit_center_rooms_v1";

const seedLogs=[
  {time:new Date(Date.now()-3600000).toISOString(),actor:"admin@demo.local",role:"Quản trị hệ thống",action:"CREATE",object:"Phòng",before:"—",after:'{ "maPhong":"A301", "giaThue":5500000 }'},
  {time:new Date(Date.now()-7200000).toISOString(),actor:"admin@demo.local",role:"Quản trị hệ thống",action:"UPDATE",object:"Hợp đồng",before:'{ "trangThai":"Nháp" }',after:'{ "trangThai":"Đang hiệu lực" }'},
  {time:new Date(Date.now()-10800000).toISOString(),actor:"manager@demo.local",role:"Quản lý",action:"DELETE",object:"Đơn giá dịch vụ",before:'{ "ten":"Phí vệ sinh" }',after:"—"}
];

let logs=JSON.parse(localStorage.getItem(KEY)||"null")||seedLogs;
let rooms=JSON.parse(localStorage.getItem(roomKey)||"null")||[
  {code:"A301",price:5500000,status:"Đang trống"},
  {code:"A302",price:6000000,status:"Đang thuê"}
];

const $=id=>document.getElementById(id);
function save(){localStorage.setItem(KEY,JSON.stringify(logs));localStorage.setItem(roomKey,JSON.stringify(rooms))}
function now(){return new Date().toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit",year:"numeric"})}
function addLog(action,object,before="—",after="—",actor=$("actor").value.trim()||"admin@demo.local"){
  logs.unshift({time:new Date().toISOString(),actor,role:"Quản trị hệ thống",action,object,before,after});save();render();
}
function renderStats(){
  $("totalCount").textContent=logs.length;
  $("createCount").textContent=logs.filter(x=>x.action==="CREATE").length;
  $("updateCount").textContent=logs.filter(x=>x.action==="UPDATE").length;
  $("deleteCount").textContent=logs.filter(x=>x.action==="DELETE").length;
}
function badge(a){return `<span class="badge badge-${a.toLowerCase()}">${a}</span>`}
function render(filter=false){
  renderStats();
  const actor=$("filterActor").value.trim().toLowerCase(), action=$("filterAction").value, object=$("filterObject").value;
  const from=$("filterFrom").value, to=$("filterTo").value;
  let data=logs.filter(x=>{
    const d=x.time.slice(0,10);
    return (!actor||x.actor.toLowerCase().includes(actor))&&(!action||x.action===action)&&(!object||x.object===object)&&(!from||d>=from)&&(!to||d<=to);
  });
  $("auditBody").innerHTML=data.map(x=>`<tr>
    <td>${new Date(x.time).toLocaleString("vi-VN")}</td><td><strong>${x.actor}</strong></td><td>${x.role}</td>
    <td>${badge(x.action)}</td><td>${x.object}</td><td>${x.before}</td><td>${x.after}</td>
  </tr>`).join("");
  $("emptyState").style.display=data.length?"none":"block";
  $("roomList").innerHTML=rooms.map(r=>`<div class="room-card"><div><strong>${r.code}</strong><span>${r.status}</span></div><div class="room-price">${Number(r.price).toLocaleString("vi-VN")} đ</div></div>`).join("");
}
$("manualLogBtn").onclick=()=>{
  const action=$("action").value, object=$("objectType").value;
  const before=action==="CREATE"?"—":'{ "trangThai":"Giá trị cũ" }';
  const after=action==="DELETE"?"—":'{ "trangThai":"Giá trị mới" }';
  addLog(action,object,before,after);
};
$("createRoomBtn").onclick=()=>{
  const code=$("roomCode").value.trim(), price=Number($("roomPrice").value), status=$("roomStatus").value;
  if(!code||!price){alert("Vui lòng nhập mã phòng và giá thuê.");return}
  if(rooms.some(r=>r.code.toLowerCase()===code.toLowerCase())){alert("Mã phòng đã tồn tại.");return}
  rooms.unshift({code,price,status});
  addLog("CREATE","Phòng","—",`{ "maPhong":"${code}", "giaThue":${price}, "trangThai":"${status}" }`);
  $("roomCode").value=""; $("roomPrice").value="";
};
$("loadRoomsBtn").onclick=render;
$("filterBtn").onclick=()=>render(true);
$("resetBtn").onclick=()=>{
  if(confirm("Xóa dữ liệu demo và khôi phục trạng thái ban đầu?")){
    logs=seedLogs.map(x=>({...x}));rooms=[{code:"A301",price:5500000,status:"Đang trống"},{code:"A302",price:6000000,status:"Đang thuê"}];save();render();
  }
};
render();
