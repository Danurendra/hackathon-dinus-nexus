"""Admin-local provisioning: python -m src.create_user --email ... --name ..."""
import argparse
from getpass import getpass

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from src.accounts import hash_password, normalize_email
from src.db.models import User
from src.db.session import SessionLocal


def main() -> None:
    parser = argparse.ArgumentParser(description="Buat akun workspace lokal (jalankan migrasi terlebih dahulu).")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    try:
        email = normalize_email(args.email)
        name = args.name.strip()
        if not 1 <= len(name) <= 100:
            raise ValueError("Nama harus 1–100 karakter.")
        with SessionLocal() as db:
            if db.scalar(select(User).where(User.email == email)):
                raise ValueError("Akun sudah ada; tidak ada perubahan password.")
            password = getpass("Password baru (12–128 karakter): ")
            if password != getpass("Ulangi password: "):
                raise ValueError("Konfirmasi password tidak cocok.")
            db.add(User(email=email, display_name=name, password_hash=hash_password(password)))
            db.commit()
    except ValueError as exc:
        parser.exit(1, f"{exc}\n")
    except SQLAlchemyError:
        parser.exit(1, "Database belum siap atau akun sudah ada. Periksa migrasi dan koneksi.\n")
    print("Akun berhasil dibuat. Masuk melalui /login.")


if __name__ == "__main__":
    main()
