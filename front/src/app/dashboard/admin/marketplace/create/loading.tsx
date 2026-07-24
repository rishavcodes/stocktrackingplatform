import { Loader2 } from "lucide-react";

const LoadingPage = () => {
	return (
		<div className="flex items-center justify-center">
			<Loader2 className="animate-spin h-4 w-4" />
		</div>
	);
};

export default LoadingPage;
