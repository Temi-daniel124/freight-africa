import { shellPageMetadata, shellParams, shellSection } from "@/features/shell/routes";

export const generateStaticParams = shellParams("owner");
export const generateMetadata = shellPageMetadata("owner");

export default shellSection("owner");
