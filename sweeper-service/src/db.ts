import { PrismaClient, Chain } from "./generated/prisma/client.js";

const prisma = new PrismaClient();

const getAddressToSweep = async(chain: Chain) => {
    try {
        const address = await prisma.deposit_addresses.findMany({
            where: {
                chain,
                is_active: true,
            },
            select: {
                id: true,
                address: true,
                user_id: true
            }
        });

        return address;
    } catch (error) {
        console.error(`Error while fetching deposit address to sweep from ${chain}`, error);
    }
}

export {
    getAddressToSweep
}