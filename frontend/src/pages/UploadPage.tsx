import { useNavigate } from "react-router-dom";
import FileUploader from "../components/FileUploader";

export default function UploadPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h1>
      <FileUploader onUploaded={() => navigate("/documents")} />
    </div>
  );
}
