import { Icons } from "@/components/icons";
import { siteConfig } from "@/lib/config";
import Link from "next/link";
import { FaTwitter, FaLinkedin, FaGithub, FaCode } from "react-icons/fa";
import { CgWebsite } from "react-icons/cg";

export default function Footer() {
  return (
    <footer className="border-t mt-20">
      <div className="max-w-6xl mx-auto py-8 px-5">

        <div className="text-center mt-6">
          <span className="text-sm text-muted-foreground">
            Copyright © {new Date().getFullYear()}{" "}
            <Link href="/" className="hover:text-primary transition-colors">
              {siteConfig.name}
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
