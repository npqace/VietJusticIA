import { AxiosError } from 'axios';

export const isNetworkError = (error: unknown): boolean => {
    return error instanceof Error && (error.message === 'Network Error' || error.message.includes('network'));
};

export const getErrorStatus = (error: unknown): number | undefined => {
    if (error && typeof error === 'object' && 'response' in error) {
        return (error as any).response?.status;
    }
    return undefined;
};

export const getErrorMessage = (error: unknown, defaultMessage: string = 'Đã có lỗi xảy ra.'): string => {
    if (isNetworkError(error)) {
        return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        return axiosError.response?.data?.detail || axiosError.response?.data?.message || defaultMessage;
    }

    return defaultMessage;
};

export const getChatErrorMessage = (error: unknown): string => {
    if (isNetworkError(error)) {
        return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
    }

    const status = getErrorStatus(error);

    if (status === 429) {
        return 'Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau một lúc.';
    }

    if (status === 404) {
        return 'Phiên chat không tồn tại. Vui lòng bắt đầu chat mới.';
    }

    if (status && status >= 500) {
        return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.';
    }

    return 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.';
};

export const getAccountErrorMessage = (error: unknown, action: 'deactivate' | 'delete'): string => {
    if (isNetworkError(error)) {
        return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
    }

    const status = getErrorStatus(error);

    if (status === 403) {
        return 'Bạn không có quyền thực hiện thao tác này.';
    }

    if (status === 409) {
        return action === 'delete'
            ? 'Không thể xóa tài khoản do có dữ liệu liên quan. Vui lòng liên hệ hỗ trợ.'
            : 'Không thể vô hiệu hóa tài khoản. Vui lòng thử lại.';
    }

    if (status && status >= 500) {
        return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';
    }

    return action === 'delete'
        ? 'Không thể xóa tài khoản. Vui lòng thử lại.'
        : 'Không thể vô hiệu hóa tài khoản. Vui lòng thử lại.';
};
