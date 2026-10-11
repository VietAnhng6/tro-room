import axios from "axios";


const API = "http://localhost:8080/api/invoices";


function authHeader() {
    return {
        headers: {
            Authorization:
                `Bearer ${localStorage.getItem("token")}`
        }
    };
}


// S3-08: tạo hóa đơn nháp
export function generateInvoice(data: any) {

    return axios.post(
        `${API}/generate`,
        data,
        authHeader()
    );

}


// lấy danh sách hóa đơn
export function getInvoices(
    buildingId: number,
    period: string
) {

    return axios.get(
        API,
        {
            params: {
                buildingId,
                period
            },
            ...authHeader()
        }
    );

}


// xem chi tiết
export function getInvoiceDetail(id: number) {

    return axios.get(
        `${API}/${id}`,
        authHeader()
    );

}


// phát hành hóa đơn
export function issueInvoice(id: number) {

    return axios.post(
        `${API}/${id}/issue`,
        {},
        authHeader()
    );

}