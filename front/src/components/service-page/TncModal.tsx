export default function TncModal({
    isOpen,
    onClose,
    pdfUrl,
}: {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg w-full max-w-3xl">
                <button onClick={onClose} className="float-right">
                    ✖
                </button>
                <iframe src={pdfUrl} className="w-full h-[500px]" />
            </div>
        </div>
    );
}