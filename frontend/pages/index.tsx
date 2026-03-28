import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/main/default.aspx',
      permanent: false,
    },
  };
};

export default function Home() {
  return null;
}
